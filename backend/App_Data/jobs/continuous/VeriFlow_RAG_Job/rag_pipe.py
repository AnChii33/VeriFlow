# rag_pipe

import os
import json
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.cross_encoders import HuggingFaceCrossEncoder
from langchain_classic.retrievers.document_compressors import CrossEncoderReranker
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser

def get_configuration(dotenv_path):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(script_dir, dotenv_path)
    load_dotenv(env_path)

    embedding_path = os.path.join(script_dir, os.getenv("embedding_path", ""))
    embedding_name = os.getenv("embedding_name")
    sentence_transformer = os.getenv("sentence_transformer")
    cross_encode_model = os.getenv("cross_encode_model")
    api_key = os.getenv("api_key")
    llm_model = os.getenv("llm_model")

    return embedding_path, embedding_name, sentence_transformer, cross_encode_model, api_key, llm_model

CLAUSE_QUERY_TEMPLATE = """You are a compliance rule extraction assistant.

Your task is to analyze given  the user template , understand the compliance context,

and generate a retrieval query to extract relevant text chunks from the CFR Part 11 document.

Then, transform those text chunks into descriptive compliance rules that can be used to evaluate messaging templates.

 

### Input

User template: {template_text}

Document Context: 21 CFR Part 11 (
Rule 1: Applicability of Electronic Records and Signatures
Rule 2: Scope of Application
Rule 3: System Validation
Rule 4: Audit Trails
Rule 5: Record Retention and Retrieval
Rule 6: Uniqueness of Electronic Signatures
Rule 7: Signature Manifestations
Rule 8: Signature/Record Linking
Rule 9: Access Control
Rule 10: Identification Code and Password Security
Rule 11: Training and Accountability
)

 

### Instructions

1. Interpret the user template to identify the compliance domain given as document context.

2. Generate a precise retrieval query that can be used to locate relevant text chunks in the CFR Part 11 document.
   - Retrieval query should ensure that the all the compliance rules that are relevant for analysing the given user template should be retrieved in details.

   - Keep the query should ensure that the retrieved informations are sufficient for the evaluation the user template.

3. Extract the relevant text chunks from the CFR document.

4. Convert the extracted text into **compliance rules** that are:

   - Clear and descriptive

   - Include rationale/context

   - Define measurable criteria for auditing

5. Organize the rules into categories (General Provisions, Electronic Records, Electronic Signatures, System Controls).

6. Present the output in a structured format.

 

### Output Format

Retrieval Query: [Generated query for document search]

Relevant Text Chunks: [Extracted CFR text]

Compliance Rules:

- Rule 1: [Detailed rule with rationale and measurable criteria]

- Rule 2: [Detailed rule with rationale and measurable criteria]

...

Categories: [Organized grouping of rules]
"""

COMPLIANCE_EVAL_TEMPLATE = """
You are an expert compliance evaluator. 
Your task is to assess whether a given template adheres to a set of compliance rules and identify the rules that the template is not compliant to.

### Context
Compliance Rules:
{context}

Template to Evaluate:
{template_text}

### Instructions
1. Read the compliance rules carefully.
2. Consider the whole json that is passed as template_text for analysing template against each compliance  rule.
3. For each rule:
   - Check whether the template complies with the rules or not.
   - A detailed explanation of why if the template doesnt comply.
4. Provide an overall compliance report:
   - that contains all the rules that are violated or not compliant with relevance to the definition and specification of the rule along with the explanation of why not compliant if none of the rules are violated or not compliant return NULL
   -DO NOT INCLUDE THE RULES THAT ARE NOT VIOLATED AND NOT RELEVANT
### Output Format (STRICT JSON ONLY)
Return ONLY valid JSON. No markdown. No bullet points. No explanations outside JSON.

{{
  "rules": [
    {{
      "rule": "11.1 Scope",
      "status": "NULL"(always),
      "explanation": "Explain why the template violates this rule."
    }}
  ],
  "overall_verdict": "Non-Compliant"
}}

"""

REDRAFT_TEMPLATE = """
You are a legal-tech writer specializing in 21 CFR Part 11 compliance.
Your goal is to rewrite a non-compliant messaging template to be fully compliant.

### Original Template:
{original_template}

### Violations Identified:
{violations}

### Instructions:
Based on the analysis of violations found, generate TWO distinct, high-quality ways to rewrite this template so that they are fully compliant to the rules that the initial user template violated. 
- **Suggestion 1 (Minimal Friction):** Fix the core legal issues while staying as close to the original format and intent as possible.
- **Suggestion 2 (Maximum Security):** A "best practice" rewrite that prioritizes absolute regulatory safety.

Output ONLY a valid JSON object:
{{
  "suggestion_1": "string",
  "suggestion_2": "string"
}}

"""

def load_models(env_path):
    embd_path, emb_name, sent_model, cross_model, api, llm_mod = get_configuration(env_path)

    llm = ChatGoogleGenerativeAI(
        model=llm_mod,
        google_api_key=api,
        temperature=0,
        timeout=30,      
        max_retries=2    
    )

    embeddings = HuggingFaceEmbeddings(model_name=sent_model)

    vectorstore = FAISS.load_local(
        folder_path=embd_path,
        embeddings=embeddings,
        index_name=emb_name,
        allow_dangerous_deserialization=True
    )

    cross_encoder = HuggingFaceCrossEncoder(model_name=cross_model)
    reranker = CrossEncoderReranker(model=cross_encoder, top_n=10)

    return llm, vectorstore, reranker

def generate_query(template_text, llm):
    prompt = PromptTemplate.from_template(CLAUSE_QUERY_TEMPLATE)
    chain = prompt | llm | StrOutputParser()
    try:
        query = chain.invoke({"template_text": template_text})
        return query.strip()
    except Exception as e:
        print(f"Query Generation Error: {e}")
        return template_text

def retrieve_context(query, vectorstore, reranker):
    try:
        raw_docs = vectorstore.similarity_search(query, k=10)
        reranked_docs = reranker.compress_documents(raw_docs, query)
        context = "\n\n".join([doc.page_content[:500] for doc in reranked_docs[:5]])
        return context
    except Exception as e:
        print(f"Retrieval Error: {e}")
        return ""

def evaluate_compliance(template_text, context, llm):
    prompt = PromptTemplate.from_template(COMPLIANCE_EVAL_TEMPLATE)
    chain = prompt | llm | JsonOutputParser()
    try:
        return chain.invoke({
            "context": context,
            "template_text": template_text
        })
    except Exception as e:
        print(f"Evaluation Error: {e}")
        return {"rules": [], "overall_verdict": "Error"}

def generate_redrafts(template_text, eval_report, llm):
    if not eval_report.get("rules"):
        return {}
    prompt = PromptTemplate.from_template(REDRAFT_TEMPLATE)
    chain = prompt | llm | JsonOutputParser()
    try:
        return chain.invoke({
            "original_template": template_text,
            "violations": json.dumps(eval_report["rules"], indent=2)
        })
    except Exception as e:
        print(f"Redraft Error: {e}")
        return {}

def validate_template_pipeline(template_text, llm, vectorstore, reranker):
    query = generate_query(template_text, llm)
    context = retrieve_context(query, vectorstore, reranker)
    eval_report = evaluate_compliance(template_text, context, llm)
    suggestions = generate_redrafts(template_text, eval_report, llm)

    flags = []
    for r in eval_report.get("rules", []):
        flags.append({
            "cfr_section": r.get("rule", "UNKNOWN"),
            "explanation": r.get("explanation", ""),
            "status": "pending"
        })

    redrafts = []
    if "suggestion_1" in suggestions:
        redrafts.append({"modContent": suggestions["suggestion_1"]})
    if "suggestion_2" in suggestions:
        redrafts.append({"modContent": suggestions["suggestion_2"]})

    return {
        "flags": flags,
        "redrafts": redrafts
    }

if __name__ == "__main__":
    sample_clause = """Hello, please confirm consent for receiving branded communication."""
    test_llm, test_vs, test_reranker = load_models(".env")
    result = validate_template_pipeline(sample_clause, test_llm, test_vs, test_reranker)

    print("\n--- FINAL OUTPUT ---")
    print(json.dumps(result, indent=4, ensure_ascii=False))