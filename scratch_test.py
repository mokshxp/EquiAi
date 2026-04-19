import requests

files = {
    'file': ('test.csv', b'Name,Gender,Race,Selected\nAlice,Female,Asian,No\nBob,Male,White,Yes\n', 'text/csv'),
}
data = {
    'jurisdiction': 'US_EEOC',
    'language': 'English'
}
try:
    r = requests.post('http://localhost:8000/api/analyze', files=files, data=data)
    print(f"Status Code: {r.status_code}")
    print(f"Response: {r.text[:500]}")
except Exception as e:
    print(f"Exception: {e}")
