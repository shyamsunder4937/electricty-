import sys
from pathlib import Path
import json

# Add ML_PIPELINE to path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(BASE_DIR / "ML_PIPELINE"))

# Lazy import - only load when needed
_query_rag = None

def get_query_rag():
    global _query_rag
    if _query_rag is None:
        from rag_pipeline.rag_query import query_rag
        _query_rag = query_rag
    return _query_rag

# Load image mapping
IMAGE_MAPPING_PATH = BASE_DIR / "rag_images" / "image_mapping.json"
IMAGE_MAPPING = {}

try:
    if IMAGE_MAPPING_PATH.exists():
        with open(IMAGE_MAPPING_PATH, 'r') as f:
            IMAGE_MAPPING = json.load(f)
except Exception as e:
    print(f"Warning: Could not load image mapping: {e}")


def extract_pdf_name_from_source(source_path):
    """Extract clean PDF name from source path"""
    if not source_path:
        return None
    
    # Handle both forward and backward slashes
    filename = source_path.replace('\\', '/').split('/')[-1]
    # Remove .pdf extension
    return filename.replace('.pdf', '')


def query_rag_with_sources(question, k=5):
    """Query RAG and return both answer and source documents"""
    try:
        from rag_pipeline.embedding_model import load_embedding_model
        from rag_pipeline.vector_store import load_vector_store
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
        
        # If answer is too short, enhance it with key information
        if len(answer) < 150:
            key_info = []
            for doc in docs_to_use[:3]:
                content = doc.page_content.strip()
                if '.....' not in content and len(content) > 100:
                    paragraphs = [p.strip() for p in content.split('\n\n') if len(p.strip()) > 50]
                    if paragraphs:
                        key_info.append(paragraphs[0][:400])
            
            if key_info:
                answer = ' '.join(key_info[:2])
        
        return {
            'answer': answer,
            'source_documents': docs_to_use
        }
        
    except Exception as e:
        print(f"Error in query_rag_with_sources: {e}")
        # Improved fallback
        from rag_pipeline.embedding_model import load_embedding_model
        from rag_pipeline.vector_store import load_vector_store
        
        embeddings = load_embedding_model()
        vectorstore = load_vector_store(embeddings)
        docs = vectorstore.similarity_search(question, k=k)
        
        # Filter and clean the content
        clean_content = []
        clean_docs = []
        for doc in docs:
            content = doc.page_content.strip()
            content_lower = content.lower()
            # Skip TOC, conclusions, references
            if any(skip in content_lower[:100] for skip in ['conclusion', 'references', 'table of contents', '........']):
                continue
            if content.count('....') > 3:
                continue
            # Take meaningful paragraphs
            paragraphs = [p.strip() for p in content.split('\n\n') if len(p.strip()) > 50]
            if paragraphs:
                clean_content.append(paragraphs[0][:500])
                clean_docs.append(doc)
            if len(clean_content) >= 3:
                break
        
        answer = ' '.join(clean_content) if clean_content else "I found relevant information in the electricity policy documents, but I'm having trouble formatting a clear answer. Please try rephrasing your question."
        
        return {
            'answer': answer,
            'source_documents': clean_docs if clean_docs else docs[:k]
        }


def is_browser_compatible_image(filename):
    """Check if image format is browser-compatible"""
    compatible_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    return any(filename.lower().endswith(ext) for ext in compatible_extensions)


def get_relevant_images_from_sources(source_documents, max_images=3):
    """Get relevant images from the actual source documents retrieved by RAG
    Returns multiple images per document including graphs, tables, and charts
    Only returns browser-compatible image formats (PNG, JPEG, GIF, WebP)"""
    relevant_images = []
    pdf_image_map = {}  # Track images per PDF with their page distances
    
    for doc in source_documents:
        # Extract source from metadata
        source = doc.metadata.get('source', '')
        pdf_name = extract_pdf_name_from_source(source)
        
        if not pdf_name:
            continue
        
        # Find matching images for this PDF
        for mapping_key, images in IMAGE_MAPPING.items():
            if pdf_name.lower() in mapping_key.lower() or mapping_key.lower() in pdf_name.lower():
                if images:
                    # Get page number from document if available
                    page_num = doc.metadata.get('page', 0)
                    
                    # Collect images from the same page and nearby pages
                    for img in images:
                        img_filename = img.get('filename', '')
                        
                        # Skip non-browser-compatible formats (like .jpx)
                        if not is_browser_compatible_image(img_filename):
                            continue
                        
                        img_page = img.get('page', 0)
                        page_diff = abs(img_page - page_num)
                        
                        # Include images from same page or within 2 pages
                        if page_diff <= 2:
                            if pdf_name not in pdf_image_map:
                                pdf_image_map[pdf_name] = []
                            
                            # Store image with its page difference for sorting
                            pdf_image_map[pdf_name].append({
                                'filename': img_filename,
                                'page': img_page,
                                'distance': page_diff
                            })
                break
    
    # Sort and select images from each PDF
    for pdf_name, images in pdf_image_map.items():
        # Sort by page distance (closest first), then by page number
        images.sort(key=lambda x: (x['distance'], x['page']))
        
        # Take up to 2 images per PDF to show variety (graphs, tables, etc.)
        images_per_pdf = min(2, len(images))
        for img in images[:images_per_pdf]:
            if len(relevant_images) >= max_images:
                break
            relevant_images.append(img['filename'])
        
        if len(relevant_images) >= max_images:
            break
    
    return relevant_images


def get_relevant_images_by_keywords(query_keywords, max_images=3):
    """Fallback: Get relevant images based on query keywords with improved matching
    Returns multiple images per PDF including graphs and tables
    Only returns browser-compatible image formats (PNG, JPEG, GIF, WebP)"""
    relevant_images = []
    
    # Enhanced keyword mapping with more comprehensive terms
    keyword_map = {
        'pricing': ['tariff', 'price', 'rate', 'cost', 'electricity-market', 'determination'],
        'tariff': ['pricing', 'rate', 'determination', 'policy', 'slab'],
        'bill': ['tariff', 'consumption', 'determination', 'annual', 'report'],
        'energy': ['electricity', 'power', 'consumption', 'footprint', 'saving'],
        'saving': ['efficiency', 'energy', 'footprint', 'residential', 'potential'],
        'consumption': ['energy', 'power', 'footprint', 'residential', 'appliance'],
        'demand': ['response', 'flexibility', 'load', 'quantifying'],
        'grid': ['smart', 'regulations', 'electricity', 'model'],
        'policy': ['national', 'electricity', 'tariff'],
        'market': ['electricity', 'reform', 'transforming'],
        'residential': ['home', 'household', 'appliance', 'footprint'],
        'tamil': ['nadu', 'pathways', 'electric']
    }
    
    # Expand query keywords
    expanded_keywords = set()
    for keyword in query_keywords:
        keyword_lower = keyword.lower()
        expanded_keywords.add(keyword_lower)
        if keyword_lower in keyword_map:
            expanded_keywords.update(keyword_map[keyword_lower])
    
    # Score PDFs based on keyword matches with improved algorithm
    pdf_scores = {}
    for pdf_name, images in IMAGE_MAPPING.items():
        # Filter for browser-compatible images only
        compatible_images = [img for img in images if is_browser_compatible_image(img.get('filename', ''))]
        
        if not compatible_images:
            continue
        
        pdf_name_lower = pdf_name.lower()
        pdf_words = set(pdf_name_lower.replace('-', ' ').replace('_', ' ').split())
        score = 0
        
        for keyword in expanded_keywords:
            # Exact phrase match in PDF name
            if keyword in pdf_name_lower:
                score += 5
            
            # Word-level matches
            for word in pdf_words:
                if keyword == word:
                    score += 3
                elif keyword in word or word in keyword:
                    score += 1
        
        if score > 0:
            pdf_scores[pdf_name] = (score, compatible_images)
    
    # Sort PDFs by score
    sorted_pdfs = sorted(pdf_scores.items(), key=lambda x: x[1][0], reverse=True)
    
    # Get multiple images from top-scoring PDFs to show graphs, tables, etc.
    for pdf_name, (score, compatible_images) in sorted_pdfs[:max_images]:
        if len(relevant_images) >= max_images:
            break
        
        # Get up to 2 images per PDF to show variety (graphs, tables, charts)
        images_to_add = min(2, len(compatible_images), max_images - len(relevant_images))
        for i in range(images_to_add):
            relevant_images.append(compatible_images[i]['filename'])
    
    return relevant_images


def get_pricing_explanation(predicted_load, price_per_kwh, is_peak, time_of_day=None, appliance_name=None, is_peak_by_lstm=False, peak_reason=None):
    """Generate explanation for electricity pricing using RAG"""
    
    # Determine time period description
    if time_of_day is not None:
        if 6 <= time_of_day < 10:
            time_desc = "morning peak hours (6-10 AM)"
        elif 18 <= time_of_day < 22:
            time_desc = "evening peak hours (6-10 PM)"
        elif 22 <= time_of_day or time_of_day < 6:
            time_desc = "night off-peak hours (10 PM-6 AM)"
        elif 10 <= time_of_day < 18:
            time_desc = "mid-day hours (10 AM-6 PM)"
        else:
            time_desc = f"{time_of_day}:00 hours"
    else:
        time_desc = "this time"
    
    appliance_context = f"for your {appliance_name} ({predicted_load:.2f} kWh predicted load)" if appliance_name else "for this appliance"
    
    # Create varied questions based on price tier
    if price_per_kwh <= 5:
        question = f"Why is electricity cheapest at ₹{price_per_kwh}/kWh during {time_desc}? Explain off-peak pricing benefits and how consumers can save money by shifting usage to these hours {appliance_context}."
    elif price_per_kwh <= 7:
        question = f"Explain moderate electricity pricing at ₹{price_per_kwh}/kWh during {time_desc}. How does this mid-tier pricing work and what factors determine these rates {appliance_context}?"
    else:
        question = f"Why is electricity most expensive at ₹{price_per_kwh}/kWh during {time_desc}? Explain peak hour pricing, demand charges, and how to avoid high costs {appliance_context}."
    
    try:
        result = query_rag_with_sources(question, k=5)
        explanation = result['answer']
        source_docs = result['source_documents']
        
        # Add specific context based on appliance and time
        if appliance_name and time_of_day is not None:
            if is_peak:
                prefix = f"⚠️ Running {appliance_name} during {time_desc} costs ₹{price_per_kwh}/kWh (peak rate). "
            else:
                prefix = f"✅ Running {appliance_name} during {time_desc} costs only ₹{price_per_kwh}/kWh (off-peak rate). "
            explanation = prefix + explanation
        
        # Get relevant images from actual source documents
        images = get_relevant_images_from_sources(source_docs, max_images=3)
        
        # Fallback to keyword-based matching if no images found
        if not images:
            images = get_relevant_images_by_keywords(['pricing', 'tariff', 'electricity', 'rate', 'determination'], max_images=2)
        
        return {
            "text": explanation,
            "images": images
        }
    except Exception as e:
        print(f"RAG error in pricing explanation: {e}")
        if is_peak:
            fallback = f"⚠️ Peak hour pricing at ₹{price_per_kwh}/kWh during {time_desc}. High demand increases costs. Consider shifting {appliance_name or 'this appliance'} to off-peak hours (10 PM-6 AM) to save up to 50%."
        else:
            fallback = f"✅ Off-peak pricing at ₹{price_per_kwh}/kWh during {time_desc}. Lower demand means cheaper rates. Great time to run {appliance_name or 'this appliance'}!"
        return {
            "text": fallback,
            "images": []
        }


def get_bill_explanation(energy_kwh, total_cost, appliance_watt, appliance_name=None, duration_hours=None, time_of_day=None, is_peak=False):
    """Generate explanation for bill amount using RAG"""
    
    appliance_desc = f"{appliance_name} ({appliance_watt}W)" if appliance_name else f"appliance ({appliance_watt}W)"
    duration_desc = f"{duration_hours} hour{'s' if duration_hours != 1 else ''}" if duration_hours else "the specified duration"
    
    # Determine time period
    if time_of_day is not None:
        if 6 <= time_of_day < 10:
            time_period = "morning peak (6-10 AM)"
        elif 18 <= time_of_day < 22:
            time_period = "evening peak (6-10 PM)"
        elif 22 <= time_of_day or time_of_day < 6:
            time_period = "night off-peak (10 PM-6 AM)"
        else:
            time_period = f"{time_of_day}:00 hours"
    else:
        time_period = "this time"
    
    # Create varied questions based on consumption level
    if energy_kwh < 0.5:
        question = f"How is the electricity bill calculated for low consumption of {energy_kwh:.2f} kWh when running {appliance_desc} for {duration_desc} during {time_period}? Explain the minimum charges, fixed costs, and slab rates for small consumers in India."
    elif energy_kwh < 2:
        question = f"Explain the electricity bill calculation for {energy_kwh:.2f} kWh consumption from running {appliance_desc} for {duration_desc} during {time_period}. What are the applicable tariff slabs, energy charges, and additional components?"
    else:
        question = f"How is the electricity bill calculated for high consumption of {energy_kwh:.2f} kWh when running {appliance_desc} for {duration_desc} during {time_period}? Explain higher slab rates, demand charges, and ways to reduce costs."
    
    try:
        result = query_rag_with_sources(question, k=5)
        explanation = result['answer']
        source_docs = result['source_documents']
        
        # Add specific calculation summary
        cost_per_kwh = total_cost / energy_kwh if energy_kwh > 0 else 0
        summary = f"💡 Running {appliance_desc} for {duration_desc} during {time_period} consumes {energy_kwh:.2f} kWh at ₹{cost_per_kwh:.2f}/kWh = ₹{total_cost:.2f}. "
        explanation = summary + explanation
        
        # Get relevant images from actual source documents
        images = get_relevant_images_from_sources(source_docs, max_images=3)
        
        # Fallback to keyword-based matching if no images found
        if not images:
            images = get_relevant_images_by_keywords(['bill', 'tariff', 'consumption', 'slab', 'determination'], max_images=2)
        
        return {
            "text": explanation,
            "images": images
        }
    except Exception as e:
        print(f"RAG error in bill explanation: {e}")
        cost_per_kwh = total_cost / energy_kwh if energy_kwh > 0 else 0
        return {
            "text": f"💡 Running {appliance_desc} for {duration_desc} during {time_period} consumes {energy_kwh:.2f} kWh at ₹{cost_per_kwh:.2f}/kWh = ₹{total_cost:.2f}. Your bill includes energy charges based on consumption slabs plus fixed charges.",
            "images": []
        }


def get_energy_saving_tips(appliance_watt, duration_hours, appliance_name=None, time_of_day=None, is_peak=False, predicted_load=None):
    """Get energy saving recommendations using RAG"""
    
    appliance_desc = f"{appliance_name} ({appliance_watt}W)" if appliance_name else f"appliance ({appliance_watt}W)"
    
    # Determine time period and savings opportunity
    if time_of_day is not None:
        if 6 <= time_of_day < 10:
            time_desc = "morning peak hours (6-10 AM)"
            savings_tip = "Consider shifting to off-peak hours (10 PM-6 AM) to save up to 50% on costs."
        elif 18 <= time_of_day < 22:
            time_desc = "evening peak hours (6-10 PM)"
            savings_tip = "Shift to night hours (10 PM-6 AM) for maximum savings."
        elif 22 <= time_of_day or time_of_day < 6:
            time_desc = "night off-peak hours (10 PM-6 AM)"
            savings_tip = "Great timing! You're already using the cheapest hours."
        else:
            time_desc = f"{time_of_day}:00 hours"
            savings_tip = "Consider shifting to night hours for better rates."
    else:
        time_desc = "this time"
        savings_tip = "Optimize your usage timing for cost savings."
    
    # Create varied questions based on appliance type and wattage
    if appliance_watt < 100:
        question = f"What are the best energy efficiency tips for low-power appliances like {appliance_desc} running during {time_desc}? Include practical ways to minimize standby power, optimize usage patterns, and reduce overall consumption for Indian households."
    elif appliance_watt < 1000:
        question = f"How can I reduce electricity consumption for medium-power appliances like {appliance_desc} running during {time_desc}? Provide specific energy-saving strategies, optimal usage times, and efficiency improvements for Indian homes."
    else:
        question = f"What are the most effective ways to save energy when using high-power appliances like {appliance_desc} during {time_desc}? Include load shifting strategies, efficiency upgrades, and cost-reduction techniques for Indian households."
    
    try:
        result = query_rag_with_sources(question, k=5)
        tips = result['answer']
        source_docs = result['source_documents']
        
        # Add specific timing recommendation
        timing_prefix = f"⏰ Timing Tip: {savings_tip}\n\n"
        tips = timing_prefix + tips
        
        # Get relevant images from actual source documents
        images = get_relevant_images_from_sources(source_docs, max_images=3)
        
        # Fallback to keyword-based matching if no images found
        if not images:
            images = get_relevant_images_by_keywords(['energy', 'saving', 'efficiency', 'consumption', 'residential', 'appliance'], max_images=2)
        
        return {
            "text": tips,
            "images": images
        }
    except Exception as e:
        print(f"RAG error in energy saving tips: {e}")
        
        # Provide specific fallback tips based on appliance type
        if appliance_watt < 100:
            fallback = f"⏰ Timing Tip: {savings_tip}\n\n💡 For {appliance_desc}:\n• Unplug when not in use to avoid standby power\n• Use during off-peak hours (10 PM-6 AM) for lower rates\n• Consider energy-efficient alternatives\n• Regular maintenance improves efficiency"
        elif appliance_watt < 1000:
            fallback = f"⏰ Timing Tip: {savings_tip}\n\n💡 For {appliance_desc}:\n• Schedule usage during off-peak hours (10 PM-6 AM)\n• Use energy-saving modes when available\n• Maintain optimal settings to reduce consumption\n• Consider upgrading to 5-star rated models"
        else:
            fallback = f"⏰ Timing Tip: {savings_tip}\n\n💡 For {appliance_desc}:\n• CRITICAL: Shift to off-peak hours (10 PM-6 AM) to save 50%\n• Use timer switches for automatic scheduling\n• Upgrade to energy-efficient models (5-star rating)\n• Reduce usage duration where possible"
        
        return {
            "text": fallback,
            "images": []
        }



def extract_keywords_from_question(question):
    """Extract relevant keywords from user question for image matching"""
    question_lower = question.lower()
    
    # Define keyword categories
    keyword_categories = {
        'pricing': ['price', 'pricing', 'cost', 'rate', 'tariff', 'charge', 'rupee', 'rs', 'expensive', 'cheap'],
        'bill': ['bill', 'billing', 'invoice', 'payment', 'amount', 'calculate'],
        'tariff': ['tariff', 'slab', 'rate', 'tier', 'structure'],
        'energy': ['energy', 'electricity', 'power', 'kwh', 'kilowatt', 'watt'],
        'saving': ['save', 'saving', 'reduce', 'efficiency', 'efficient', 'optimize', 'conservation'],
        'consumption': ['consumption', 'usage', 'use', 'consume', 'demand'],
        'demand': ['demand', 'response', 'flexibility', 'load', 'peak', 'off-peak'],
        'grid': ['grid', 'smart', 'network', 'distribution', 'transmission'],
        'policy': ['policy', 'regulation', 'law', 'rule', 'government', 'national'],
        'residential': ['residential', 'home', 'household', 'domestic', 'house', 'appliance'],
        'market': ['market', 'reform', 'trading', 'exchange'],
        'renewable': ['renewable', 'solar', 'wind', 'green', 'clean'],
        'tamil': ['tamil', 'nadu', 'tn', 'tamilnadu']
    }
    
    # Extract matching keywords
    extracted_keywords = set()
    for category, keywords in keyword_categories.items():
        for keyword in keywords:
            if keyword in question_lower:
                extracted_keywords.add(category)
                break
    
    # If no specific keywords found, use general terms
    if not extracted_keywords:
        extracted_keywords = {'energy', 'electricity', 'policy'}
    
    return list(extracted_keywords)


def chat_assistant(question, k=5):
    """
    General chat assistant that answers questions with relevant images
    Returns both text answer and relevant images
    """
    try:
        # Get answer with source documents
        result = query_rag_with_sources(question, k=k)
        answer = result['answer']
        source_docs = result['source_documents']
        
        # Extract keywords from question for better image matching
        question_keywords = extract_keywords_from_question(question)
        
        # Get relevant images from actual source documents
        images = get_relevant_images_from_sources(source_docs, max_images=5)
        
        # Fallback to keyword-based matching if no images found
        if not images:
            images = get_relevant_images_by_keywords(question_keywords, max_images=4)
        
        # Extract source information for transparency
        sources = []
        seen_sources = set()
        for doc in source_docs[:3]:  # Top 3 sources
            source = doc.metadata.get('source', '')
            pdf_name = extract_pdf_name_from_source(source)
            if pdf_name and pdf_name not in seen_sources:
                page = doc.metadata.get('page', 'N/A')
                sources.append({
                    'document': pdf_name,
                    'page': page
                })
                seen_sources.add(pdf_name)
        
        return {
            "status": "success",
            "answer": answer,
            "images": images,
            "sources": sources,
            "question": question
        }
        
    except Exception as e:
        print(f"RAG error in chat assistant: {e}")
        import traceback
        traceback.print_exc()
        
        # Fallback response
        return {
            "status": "error",
            "answer": "I apologize, but I'm having trouble accessing the knowledge base right now. Please try rephrasing your question or try again later.",
            "images": [],
            "sources": [],
            "question": question,
            "error": str(e)
        }


def get_contextual_response(question, context_type=None):
    """
    Get contextual responses for specific topics with enhanced answers and images
    context_type: 'tariff', 'policy', 'tips', 'bill', 'peak_hours', 'demand_response'
    """
    
    # Enhanced questions based on context
    context_questions = {
        'tariff': f"{question} Provide detailed information about tariff slabs, rates, and pricing structure.",
        'policy': f"{question} Include information about regulations, government policies, and implementation.",
        'tips': f"{question} Provide practical, actionable tips for Indian households.",
        'bill': f"{question} Explain the calculation method, components, and billing structure.",
        'peak_hours': f"{question} Include information about time-of-day pricing and peak/off-peak hours.",
        'demand_response': f"{question} Explain how demand response works and its benefits."
    }
    
    # Use enhanced question if context provided
    enhanced_question = context_questions.get(context_type, question)
    
    # Get response using chat assistant
    return chat_assistant(enhanced_question, k=5)
