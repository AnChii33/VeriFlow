import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

def build_cfr_database():
    print("=== FDA 21 CFR Part 11 Database Builder ===")
    
    # 1. Get the inputs (Just like your script)
    pdf_path = input("Enter the full path to your PDF document: ").strip('"').strip("'")
    save_folder = input("Enter the folder path to save the database (e.g., ./cfr_vectorstore): ")
    index_name = input("Enter the name of the database (e.g., database): ")
    
    # Ensure the save folder exists
    os.makedirs(save_folder, exist_ok=True)

    print("\n1. Extracting text from PDF...")
    # LangChain's native PDF reader
    loader = PyPDFLoader(pdf_path)
    documents = loader.load()

    print("2. Chunking the text...")
    # LangChain's native splitter (much better than raw regex!)
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, 
        chunk_overlap=200
    )
    chunks = text_splitter.split_documents(documents)
    print(f"Created {len(chunks)} chunks.")

    print("3. Generating embeddings and building FAISS index...")
    # Using the exact same HuggingFace model you chose
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    # This automatically embeds everything and creates the LangChain structure
    vectorstore = FAISS.from_documents(chunks, embeddings)

    print("4. Saving to disk...")
    # This natively creates BOTH the .faiss and .pkl files in the correct LangChain format
    vectorstore.save_local(folder_path=save_folder, index_name=index_name)
    
    print(f"\nSuccess! Your database files are saved in: {save_folder}")

if __name__ == "__main__":
    build_cfr_database()