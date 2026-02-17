from .document_loader import load_documents
from .text_splitter import split_documents
from .embedding_model import load_embedding_model
from .vector_store import create_vector_store, save_vector_store, load_vector_store


# STEP 1 → Build Vector DB (Run Once)
def build_rag_database(doc_folder="rag_documents"):

    documents = load_documents(doc_folder)

    chunks = split_documents(documents)

    embeddings = load_embedding_model()

    vectorstore = create_vector_store(chunks, embeddings)

    save_vector_store(vectorstore)

    print("✅ RAG Vector DB Created")


# STEP 2 → Query RAG with better answer generation
def query_rag(question, k=5):
    try:
        from transformers import pipeline
        
        embeddings = load_embedding_model()
        vectorstore = load_vector_store(embeddings)

        # Retrieve more documents initially for filtering
        docs = vectorstore.similarity_search(question, k=k*2)
        
        # Filter out table of contents, conclusions, references sections
        filtered_docs = []
        skip_keywords = [
            'table of contents', 'contents', 'conclusion', 'conclusions', 
            'references', 'bibliography', 'annexure', 'appendix',
            '........', '..........', '............'  # TOC dots
        ]
        
        for doc in docs:
            content_lower = doc.page_content.lower()
            # Skip if it's mostly TOC or references
            if any(keyword in content_lower[:100] for keyword in skip_keywords):
                continue
            # Skip if it has too many dots (TOC pattern)
            if content_lower.count('....') > 3:
                continue
            filtered_docs.append(doc)
            if len(filtered_docs) >= k:
                break
        
        # Use filtered docs or original if filtering removed too many
        docs_to_use = filtered_docs if len(filtered_docs) >= 2 else docs[:k]
        
        # Combine context from retrieved documents
        context = "\n\n".join([doc.page_content for doc in docs_to_use])
        
        # Increase context size limit for more complete answers
        if len(context) > 8000:
            context = context[:8000]
        
        # Use text generation model for better answers
        generator = pipeline(
            "text2text-generation",
            model="google/flan-t5-base",
            device=-1,
            max_length=512
        )
        
        # Create improved prompt for better answers
        prompt = f"""Based on the following context about electricity policies and tariffs in India, provide a clear, detailed, and well-structured answer to the question. Focus on practical information and avoid mentioning document structure elements.

Context: {context}

Question: {question}

Provide a comprehensive answer:"""
        
        # Generate answer with increased length for complete responses
        result = generator(
            prompt, 
            max_length=512, 
            min_length=150,
            do_sample=False,
            num_beams=4,
            early_stopping=True
        )
        
        answer = result[0]['generated_text'].strip()
        
        # Clean up the answer
        answer = answer.replace('Based on the electricity policy documents:', '').strip()
        
        # If answer is too short or seems incomplete, enhance it
        if len(answer) < 150:
            # Extract key information from context
            key_info = []
            for doc in docs_to_use[:3]:
                content = doc.page_content.strip()
                # Skip TOC-like content
                if '.....' not in content and len(content) > 100:
                    # Take first meaningful paragraph
                    paragraphs = [p.strip() for p in content.split('\n\n') if len(p.strip()) > 50]
                    if paragraphs:
                        key_info.append(paragraphs[0][:400])
            
            if key_info:
                answer = ' '.join(key_info[:2])
        
        return answer
        
    except Exception as e:
        print(f"Error in query_rag: {e}")
        # Improved fallback: return clean, formatted context
        embeddings = load_embedding_model()
        vectorstore = load_vector_store(embeddings)
        docs = vectorstore.similarity_search(question, k=k)
        
        # Filter and clean the content
        clean_content = []
        for doc in docs:
            content = doc.page_content.strip()
            # Skip TOC, conclusions, references
            content_lower = content.lower()
            if any(skip in content_lower[:100] for skip in ['conclusion', 'references', 'table of contents', '........']):
                continue
            # Skip if too many dots (TOC pattern)
            if content.count('....') > 3:
                continue
            # Take meaningful paragraphs
            paragraphs = [p.strip() for p in content.split('\n\n') if len(p.strip()) > 50]
            if paragraphs:
                clean_content.append(paragraphs[0][:500])
            if len(clean_content) >= 3:
                break
        
        if clean_content:
            return ' '.join(clean_content)
        else:
            return "I found relevant information in the electricity policy documents, but I'm having trouble formatting a clear answer. Please try rephrasing your question or be more specific."
