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
You are an legal AI assistant. Analyze the following clause from a user-submitted document. 
Generate a precise, optimized search query to retrieve the relevant compliance rules from the 21 CFR Part 11 regulatory guidelines.
Do not answer the query, just generate the search string.

Template Clause: {template_text}
Optimized Search Query:
"""

COMPLIANCE_EVAL_TEMPLATE = """
You are expert regulatory auditor specializing in 21 CFR Part 11 compliance. 
Evaluate the user's template clause against the retrieved regulatory policy context.
Determine if the template complies with the rules.

Return your analysis STRICTLY as a JSON object with the following keys:
- "status": Must be exactly "Compliant" or "Requires Review"
- "title": A short 3-5 word title of the issue (e.g., "Missing Biometric Requirement")
- "reason": A 1-2 sentence explanation of why it fails or passes based ONLY on the policy context.
- "suggestion": The exact rewritten text the user should insert to fix the issue (or null if compliant).

Policy Context (21 CFR Part 11 rules):
{context}

User Template Clause:
{template_text}
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