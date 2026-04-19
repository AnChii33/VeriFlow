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

REPHRASE_TEMPLATE = """
Analyze the Conversational history to understand the context. Rewrite the given query into a clear, self-contained, and precise standalone query for efficient retrieval. If history is empty, return the original query.
History: {history}
Query: {query}
Rephrased query:
"""

EXPAND_TEMPLATE = """
Expand the given user query into {n} semantically similar search queries. Evaluate those queries and return ONLY the best, single optimized query that would perform best for a RAG pipeline.
Query: {query}
"""

DECOMPOSE_TEMPLATE = """
Analyze the user query. If it is big and complex, break it into a minimal number of helpful sub-queries for retrieval optimization. Return ONLY the subqueries, one per line.
Query: {query}
"""

QNA_TEMPLATE = """
Generate a meaningful, detailed paragraph answer for the query based ONLY on the provided context. Answer clearly and understandably. Do not use phrases like "based on the context".
Context: {context}
Query: {query}
"""


#main for query optimization
def query_optimize(useq, chats, llm):
    qlist = []
    
    # 1. Rephrase
    history_text = "\n".join(f"{item['Query']}: {item['Response']}" for item in chats)
    rephrase_chain = create_chain(REPHRASE_TEMPLATE, llm)
    useq = rephrase_chain.invoke({"history": history_text, "query": useq})
    
    # 2. Expand 
    expand_chain = create_chain(EXPAND_TEMPLATE, llm)
    useq = expand_chain.invoke({"n": 5, "query": useq})
    
    # 3. Decompose
    decompose_chain = create_chain(DECOMPOSE_TEMPLATE, llm)
    sub_queries_text = decompose_chain.invoke({"query": useq})
    
    # Clean up output
    qlist.extend([q.strip("- ").strip() for q in sub_queries_text.split("\n") if q.strip()])
    if not qlist:
        qlist.append(useq)
        
    return qlist, useq # Return BOTH the list of sub-queries and the main optimized query

def query_pipeline(env_path,useq,chats):
    embd_path,emb_name,sent_model,cross_model,api,llm_mod=get_configuration(env_path)

    llm = ChatGoogleGenerativeAI(model=llm_mod, google_api_key=api)

    embeddings = HuggingFaceEmbeddings(model_name=sent_model)
    vectorstore = FAISS.load_local(
       folder_path=embd_path, 
       embeddings=embeddings, 
       index_name=emb_name, 
       allow_dangerous_deserialization=True
    ) # Required by LangChain to read your .pkl file

    cross_encoder = HuggingFaceCrossEncoder(model_name=cross_model)
    reranker = CrossEncoderReranker(model=cross_encoder, top_n=10)

    
    #Query Optimization
    query_list, optimized_query = query_optimize(useq,chats,llm)

    all_retrieved_docs = []

    for q in query_list:
        #retrieving the chunks that are similar to the given query.
        k=10#int(input("enter the no. of similar chunks to be extracted:"))
        docs = vectorstore.similarity_search(q, k=5) 
        all_retrieved_docs.extend(docs)

    unique_docs = {doc.page_content: doc for doc in all_retrieved_docs}.values()
    print("Reranking documents...")
    reranked_docs = reranker.compress_documents(list(unique_docs), optimized_query)

    # Join the best chunks into a single context string
    context = "\n\n".join([doc.page_content for doc in reranked_docs])
    
    # Create the LangChain Q&A chain and generate the answer
    qna_chain = create_chain(QNA_TEMPLATE, llm)
    
    print(f"\nGenerating final answer for: {optimized_query}...\n")
    resp = qna_chain.invoke({"context": context, "query": optimized_query})
    
    print(resp)
    return resp
        
print("complete!!")