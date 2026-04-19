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


#function to retrieve the index,chunktext and the embedding model
def retrieve_requirement(fpath,fname,t_model):
    ind=faiss.read_index(fpath+fname+".faiss")
    with open(os.path.join(fpath,fname+".pkl"),"rb") as f:
        chunks=pickle.load(f)
    embd_model=SentenceTransformer(t_model)
    return ind,chunks,embd_model

#semantic query matching and retrieval of the chunks
def semantic_chunks(user_q,n,embd_model,index,chtxt):
    qembed=embd_model.encode([user_q])
    distances,indices=index.search(np.array(qembed),n)
    retrieved_info=[]
    for idx in indices[0]:
        retrieved_info.append(chtxt[idx])
    return retrieved_info

#reranking module
def rerank_with_cross_encoder(query, candidates, model_name):
    # Load cross-encoder model
    cross_encoder = CrossEncoder(model_name)

    # Prepare query-candidate pairs
    pairs = [(query, passage) for passage in candidates]

    # Get relevance scores
    scores = cross_encoder.predict(pairs)

    # Sort candidates by score
    scored_candidates = sorted(zip(candidates, scores), key=lambda x: x[1], reverse=True)

    return scored_candidates


#function to generate rag response with the respective prompt
def qna_rag(content,ask,modllm):
    prompt=f"""You are a helpful assistant for my RAG pipeline. You have to generate appropriate anwer for the given query.

            Your task is to analyse the context given and the query given.
            
            Based on the information given in the context, you need to generate meaningful and detailed answer for the given query.
            
            The generated answer should have enough information with respect to the given query.
            
            The answer should be generated based on the information given in the context only.

            The answer generated should not contain phrases like "based on the given context"
            
            Context:{content}

            Query:{ask}

            Answer clearly and in easily understandable language.

            Try to give the detailed answer in paragraphs.
            
            """
    response=modllm.generate_content(prompt)
    return response.text


#function to implement query expansion module
def query_expand(usq,modellm,n=5):
    prompt=f"""You are a helpful assistant for my multi-query conversational RAG.I want you to help me in query optimization for the RAG.
                
                 User may sometimes give query that are short and not good enough for the RAG pipeline. You need to Expand the given query.
                 
                 Expand the given user query into {n} semantically similar search queries.
                 
                 Evaluate those queries and return the optimized expanded query that would perform best for my RAG
                 
                 Query:{usq}

                 Return only the best query after query evaluated, clearly and precisely
                
            """
    response=modellm.generate_content(prompt)
    return response.text


#function to implement query decomposition
def query_decompose(query,model):
    prompt=f"""You are a helpful assistant for my multi-query Q&A RAG. I want you to help me in Query optimization for the RAG pipeline.
            
            User may give a lot requirement within a single query which is not a very optimal choice for the RAG pipeline.
            
            You need to analyse the given user query.
            
            If the given query is  big and complex for retireval break the given query into sub-queries. Sub-Queries should be helpful for optimizing the Retrieval process.
            
            Don't generate unnecessary subqueries, the number of subqueries should only be according to the requiremen.
            
            Query:{query}
            
            Return only the subqueries clearly and precisely
            
            """
    response=model.generate_content(prompt)
    sub_query=response.text.split("\n")
    subquery=[q.strip("- ").strip() for q in sub_query if q.strip()]
    return subquery


#function to implement query Re-phrasing
def rephrase_query(current_query, chat_history,model):
    # Turn chat history into a simple text block
    history_text = "\n".join(f"{item['Query']}: {item['Response']}" for item in chat_history)


    prompt = f"""
    You are a helpful assistant for my multi-query Q&A RAG.I want to you to help me in Query optimization for my pipeline.
    
    In a coversational RAG like ours, follow up queries may not have the specific details but has to be referred from the previous chats to understand the context of the given query.I want you to perform Query Rephrasing.
    
    Analyse the given Conversational history to understand the context of the conversation.
    
    Rewrite/Rephrase the given query according to the context so that it becomes a standalone query for efficient retrieval.

    You can modify the given query keeping the meaning same for creating the Best Performing query.
    
    Make the query clear, self-contained, and precise.

    If the Given Conversational history is empty that means its the beginning of a conversation.
    
    Conversation history:
    {history_text}
    
    query:
    {current_query}
    
    Rephrased query:
    
    """
    response = model.generate_content(prompt)
    return response.text


#main for query optimization
def query_optimize(useq,lastchat,modellm):
    qlist=[]
    if(1):#int(input("Press 1 to incorporate query Rephrasing:"))
        useq=rephrase_query(useq, lastchat,modellm)
    if(1):#int(input("Press 1 to incorporate query expansion:"))
        useq=query_expand(useq,modellm)
    if(1):#int(input("Press 1 to incorporate query decomposition:"))
        sqt=query_decompose(useq,modellm)
        qlist.extend(sqt)
        return qlist
    qlist.append(useq)
    return qlist

def query_pipeline(env_path,useq,chats):
    embd_path,emb_name,sent_model,cross_model,api,llm_mod=get_configuration(env_path)
    llm = ChatGoogleGenerativeAI(model=llm_mod, google_api_key=api)
    index,text,model=retrieve_requirement(embd_path, emb_name,sent_model)
    
    #Configuring the llm to be used
    llm=config(llm_mod,api)
    
    #Query Optimization
    query_list=query_optimize(useq,chats,llm)
    

    for q in query_list:
        #retrieving the chunks that are similar to the given query.
        k=10#int(input("enter the no. of similar chunks to be extracted:"))
        retrieved_chunks=semantic_chunks(q,k,model,index,text)
        
        #incorporating re-ranking of the chunks
        if(1):#int(input("enter 1 to incorporate re-ranking:"))
            results = rerank_with_cross_encoder(q, retrieved_chunks,cross_model)
            my=[]
            for items in results:
                my.append(items[0])
            retrieved_chunks.clear()
            retrieved_chunks.append(my)
        
        #creating Context
        context="\n\n".join(str(i) for i in retrieved_chunks)
        
        #generating answer according to the query using llm
        print("\n\n"+q+"\n")
        resp=qna_rag(context,useq,llm)
        print(resp)
        return resp
print("complete!!")