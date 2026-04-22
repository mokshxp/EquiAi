with open(r'd:\Solution challenge\frontend\src\pages\Home.jsx', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        if 'language' in line:
            print(f"Line {i}: {line.strip()}")
