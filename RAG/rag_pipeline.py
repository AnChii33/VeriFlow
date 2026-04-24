import json
from langchain_core.output_parsers import JsonOutputParser
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.cross_encoders import HuggingFaceCrossEncoder
from langchain.retrievers.document_compressors import CrossEncoderReranker
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv


def get_configuration(dotenv_path):
    load_dotenv(dotenv_path)
    embedding_path=os.getenv("embedding_path")
    embedding_name=os.getenv("embedding_name")
    sentence_transformer=os.getenv("sentence_transformer")
    cross_encode_model=os.getenv("cross_encode_model")
    api_key=os.getenv("api_key")
    llm_model=os.getenv("llm_model")
    return embedding_path,embedding_name,sentence_transformer,cross_encode_model,api_key,llm_model

def create_chain(template, llm):
    prompt = PromptTemplate.from_template(template)
    return prompt | llm | StrOutputParser()

CLAUSE_ANALYSIS_TEMPLATE = """
You are a compliance rule extraction assistant.

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

   - Keep the query concise and focused on the compliance requirement implied by the user given template.

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
Your task is to assess whether a given template adheres to a set of compliance rules.

### Context
Compliance Rules:
{context}

Template to Evaluate:
{template_text}

### Instructions
1. Read the compliance rules carefully.
2. Analyze the template against each rule.
3. For each rule, state:
   - Whether the template complies (Yes/No).
   - A short explanation of why if the template doesnt comply.
4. Provide an overall compliance verdict:
   - "Compliant" if all rules are met.
   - "Non-Compliant" if any rule is violated.
5. Suggest specific improvements if non-compliant.

### Output Format
Compliance Evaluation Report:
- Rule 1: [Yes/No] – [Explanation]
- Rule 2: [Yes/No] – [Explanation]
...
- Overall Verdict: [Compliant/Non-Compliant]
- Recommendations: [List of improvements if needed]
"""


# 1. New function to generate the search query from the template
def generate_compliance_query(template_text, llm):
    print("Analyzing template clause to generate search query...")
    clause_chain = create_chain(CLAUSE_ANALYSIS_TEMPLATE, llm)
    search_query = clause_chain.invoke({"template_text": template_text})
    return search_query.strip()

# 2. New function to evaluate the compliance and return JSON for the UI
def evaluate_compliance(template_text, context, llm):
    print("Evaluating compliance against 21 CFR Part 11...")
    
    # We use a custom chain here to force JsonOutputParser
    prompt = PromptTemplate.from_template(COMPLIANCE_EVAL_TEMPLATE)
    eval_chain = prompt | llm | JsonOutputParser() 
    
    try:
        # This will return a Python dictionary parsed from the LLM's JSON output
        result = eval_chain.invoke({
            "context": context, 
            "template_text": template_text
        })
        return result
    except Exception as e:
        print(f"JSON Parsing Error: {e}")
        return {"status": "Error", "reason": "Failed to generate valid compliance report."}

# 3. How your new pipeline flow looks
def validate_template_pipeline(env_path, template_text):
    embd_path, emb_name, sent_model, cross_model, api, llm_mod = get_configuration(env_path)
    
    llm = ChatGoogleGenerativeAI(model=llm_mod, google_api_key=api)
    embeddings = HuggingFaceEmbeddings(model_name=sent_model)
    
    vectorstore = FAISS.load_local(
       folder_path=embd_path, 
       embeddings=embeddings, 
       index_name=emb_name, 
       allow_dangerous_deserialization=True
    )
    cross_encoder = HuggingFaceCrossEncoder(model_name=cross_model)
    reranker = CrossEncoderReranker(model=cross_encoder, top_n=5)

    # Step A: Convert the uploaded text into a targeted search query
    search_query = generate_compliance_query(template_text, llm)
    
    # Step B: Retrieve 21 CFR Part 11 rules from FAISS
    raw_docs = vectorstore.similarity_search(search_query, k=10)
    
    # Step C: Rerank to get the absolute best policy matches
    reranked_docs = reranker.compress_documents(raw_docs, search_query)
    policy_context = "\n\n".join([doc.page_content for doc in reranked_docs])
    
    # Step D: Evaluate and return the JSON payload for your web frontend
    final_report = evaluate_compliance(template_text, policy_context, llm)
    
    return final_report

        
print("complete!!")