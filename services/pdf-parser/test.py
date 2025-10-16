"""
Test script for PDF Parser Service
"""

import requests
import sys

def test_health():
    """Test health endpoint"""
    response = requests.get("http://localhost:8001/health")
    print(f"Health check: {response.status_code}")
    print(response.json())
    return response.status_code == 200

def test_parse_pdf(pdf_path):
    """Test PDF parsing"""
    with open(pdf_path, 'rb') as f:
        files = {'file': ('test.pdf', f, 'application/pdf')}
        response = requests.post("http://localhost:8001/parse", files=files)

    print(f"\nParse PDF: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Pages: {result['metadata']['pages']}")
        print(f"Text length: {len(result['text'])} characters")
        print(f"\nFirst 200 characters:\n{result['text'][:200]}...")
        return True
    else:
        print(f"Error: {response.text}")
        return False

if __name__ == "__main__":
    print("Testing PDF Parser Service\n" + "="*50)

    # Test health
    if not test_health():
        print("❌ Health check failed!")
        sys.exit(1)

    print("✓ Health check passed")

    # Test PDF parsing
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
        print(f"\nTesting with PDF: {pdf_path}")
        if test_parse_pdf(pdf_path):
            print("\n✓ PDF parsing passed")
        else:
            print("\n❌ PDF parsing failed")
            sys.exit(1)
    else:
        print("\nSkipping PDF test (no file provided)")
        print("Usage: python test.py <path-to-pdf>")

    print("\n✓ All tests passed!")
