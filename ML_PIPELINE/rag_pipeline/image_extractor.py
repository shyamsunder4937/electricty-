import os
import fitz  # PyMuPDF
from pathlib import Path
import hashlib


def extract_images_from_pdfs(pdf_folder="rag_documents", output_folder="rag_images", convert_jpx=True):
    """
    Extract all images from PDF documents and save them
    Converts JPX (JPEG2000) to PNG using PyMuPDF's pixmap for browser compatibility
    Returns a mapping of PDF names to their extracted images
    """
    
    # Create output folder if it doesn't exist
    output_path = Path(output_folder)
    output_path.mkdir(exist_ok=True)
    
    image_mapping = {}
    
    # Get all PDF files
    pdf_files = list(Path(pdf_folder).glob("*.pdf"))
    
    print(f"📄 Found {len(pdf_files)} PDF files")
    
    # Browser-compatible formats
    browser_compatible = ['png', 'jpg', 'jpeg', 'gif', 'webp']
    
    for pdf_file in pdf_files:
        pdf_name = pdf_file.stem
        pdf_images = []
        
        try:
            # Open PDF
            doc = fitz.open(pdf_file)
            
            # Iterate through pages
            for page_num in range(len(doc)):
                page = doc[page_num]
                
                # Get images on this page
                image_list = page.get_images(full=True)
                
                for img_index, img in enumerate(image_list):
                    xref = img[0]
                    
                    # Extract image
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image["image"]
                    image_ext = base_image["ext"]
                    
                    # Create unique filename
                    image_hash = hashlib.md5(image_bytes).hexdigest()[:8]
                    
                    # Convert JPX to PNG using PyMuPDF's pixmap
                    if convert_jpx and image_ext.lower() == 'jpx':
                        try:
                            # Use PyMuPDF to convert JPX to PNG
                            pix = fitz.Pixmap(doc, xref)
                            
                            # Convert CMYK to RGB if necessary
                            if pix.colorspace and pix.colorspace.n > 3:
                                pix = fitz.Pixmap(fitz.csRGB, pix)
                            
                            # Save as PNG
                            image_ext = 'png'
                            image_filename = f"{pdf_name}_page{page_num+1}_img{img_index+1}_{image_hash}.{image_ext}"
                            image_path = output_path / image_filename
                            
                            pix.save(str(image_path))
                            pix = None  # Free memory
                            
                            print(f"  🔄 Converted JPX to PNG: {image_filename}")
                        except Exception as e:
                            print(f"  ⚠️ Could not convert JPX: {e}")
                            # Fall back to original format
                            image_filename = f"{pdf_name}_page{page_num+1}_img{img_index+1}_{image_hash}.{base_image['ext']}"
                            image_path = output_path / image_filename
                            with open(image_path, "wb") as img_file:
                                img_file.write(image_bytes)
                    else:
                        # Save original format
                        image_filename = f"{pdf_name}_page{page_num+1}_img{img_index+1}_{image_hash}.{image_ext}"
                        image_path = output_path / image_filename
                        with open(image_path, "wb") as img_file:
                            img_file.write(image_bytes)
                    
                    pdf_images.append({
                        "filename": image_filename,
                        "page": page_num + 1,
                        "path": str(image_path)
                    })
            
            doc.close()
            
            if pdf_images:
                image_mapping[pdf_name] = pdf_images
                print(f"✅ Extracted {len(pdf_images)} images from {pdf_name}")
        
        except Exception as e:
            print(f"❌ Error processing {pdf_name}: {e}")
    
    print(f"\n✅ Total images extracted: {sum(len(imgs) for imgs in image_mapping.values())}")
    
    return image_mapping


def get_relevant_images(query, image_mapping, max_images=3):
    """
    Get relevant images based on query keywords
    Simple keyword matching for now
    """
    
    query_lower = query.lower()
    keywords = query_lower.split()
    
    relevant_images = []
    
    for pdf_name, images in image_mapping.items():
        # Check if PDF name matches any keyword
        pdf_name_lower = pdf_name.lower()
        
        for keyword in keywords:
            if keyword in pdf_name_lower and len(relevant_images) < max_images:
                # Add images from this PDF
                for img in images[:2]:  # Max 2 images per PDF
                    if len(relevant_images) < max_images:
                        relevant_images.append(img)
    
    return relevant_images


if __name__ == "__main__":
    # Run this to extract images from all PDFs
    mapping = extract_images_from_pdfs()
    
    # Save mapping for later use
    import json
    with open("rag_images/image_mapping.json", "w") as f:
        json.dump(mapping, f, indent=2)
    
    print("\n✅ Image mapping saved to rag_images/image_mapping.json")
