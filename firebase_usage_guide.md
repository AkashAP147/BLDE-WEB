# Firebase Database Usage Guide

## Structure Overview

The Firebase Realtime Database created by this script has the following structure:

```
students/
  <USN>/
    name: <Student Name>
    batch: <Batch Year>
    branch_code: <Branch Code>
    branch: <Branch Name>
    semesters/
      <Semester Number>/
        <Subject Code>/
          subject_name: <Subject Name>
          internal: <Internal Marks>
          external: <External Marks>
          total: <Total Marks>
          result: <Result Status>
```

## Example Data

```
students/
  2VS23CI001/
    name: John Doe
    batch: 2023
    branch_code: CI
    branch: Artificial Intelligence & Machine Learning
    semesters/
      1/
        18CS101/
          subject_name: Mathematics
          internal: 25
          external: 60
          total: 85
          result: PASS
        18CS102/
          subject_name: Physics
          internal: 22
          external: 55
          total: 77
          result: PASS
```

## How to Use in Your Application

### 1. Fetch Student Info
- Reference: `students/<USN>`
- Example:
  - `students/2VS23CI001/name` → "John Doe"
  - `students/2VS23CI001/batch` → "2023"
  - `students/2VS23CI001/branch` → "Artificial Intelligence & Machine Learning"

### 2. Fetch Semester Results
- Reference: `students/<USN>/semesters/<Semester Number>`
- Example:
  - `students/2VS23CI001/semesters/1/18CS101/total` → "85"
  - `students/2VS23CI001/semesters/1/18CS101/result` → "PASS"

### 3. List All Subjects for a Semester
- Reference: `students/<USN>/semesters/<Semester Number>`
- Iterate over all subject codes to get subject details.

### 4. Query All Students
- Reference: `students/`
- Iterate over all USNs to get student info and results.

## Integration Tips
- Use Firebase Admin SDK or Firebase client libraries for your platform (Python, JavaScript, etc.).
- Structure is optimized for quick lookup by USN and semester.
- All data is updated and overwritten per student and semester.

## Example (Python)
```python
import firebase_admin
from firebase_admin import credentials, db

cred = credentials.Certificate('serviceAccountKey.json')
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://<your-database>.firebaseio.com/'
})

# Fetch student info
usn = '2VS23CI001'
student_ref = db.reference(f'students/{usn}')
student_info = student_ref.get()

# Fetch semester subjects
sem = '1'
sem_ref = db.reference(f'students/{usn}/semesters/{sem}')
subjects = sem_ref.get()
```

## Notes
- USN and names are stored without colons.
- Semester data is replaced on each run for the same USN and semester.
- Branch and batch are parsed from USN automatically.

---
For any questions or integration help, contact the project maintainer.
