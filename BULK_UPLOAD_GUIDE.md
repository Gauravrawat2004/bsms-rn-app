# Bulk Data Upload Guide - BSMS

## Overview
This guide provides recommendations for implementing efficient bulk upload features for student and bus data in your BSMS (Bus Management System).

---

## Current Implementation
Your app already has a **Data/CSV** section in the MTO Dashboard (`/mt/data`) that allows uploading Bus & Student CSV files.

---

## Recommended Upload Options

### 1. **CSV File Upload (Current Implementation)**
**Best For:** Complete data migration, bulk updates
**Pros:**
- Easy to prepare data in Excel/Google Sheets
- Can update multiple records at once
- Good for initial system setup
- Can validate entire batch before processing

**Implementation Tips:**
```
Expected CSV Format for Students:
student_id, name, course, year, bus_no, seat, route

Expected CSV Format for Buses:
bus_no, route, capacity, driver_name, driver_contact, conductor_id, conductor_name
```

**Validation:**
- Check for duplicate IDs
- Validate bus numbers exist before assigning students
- Ensure seat numbers are within bus capacity

---

### 2. **Excel Upload with Real-time Feedback**
**Best For:** Detailed updates with error reporting
**Tools:** `expo-document-picker` + `XLSX` library

**Features to Implement:**
```typescript
- Read Excel file (.xlsx, .xls)
- Parse multiple sheets (Students, Buses, Routes)
- Show row-by-row validation errors
- Batch process with progress indicator
- Generate report of successful/failed rows
```

**Installation:**
```bash
npm install xlsx
```

---

### 3. **Google Sheets Integration**
**Best For:** Collaborative data entry
**Implementation:**
- Import data directly from shared Google Sheets
- Real-time sync option
- Requires Google API setup

**Benefits:**
- Multiple users can edit simultaneously
- Version history built-in
- Accessible from any device
- No file upload needed

---

### 4. **Manual Entry with Forms**
**Best For:** Individual updates, corrections
**Current Implementation:** Already available for:
- Add Faculty (`/mt/faculty`)
- Replace Staff (`/mt/staff`)
- Adjust Buses (`/mt/adjust`)

**Suggested Addition:**
- Add "Quick Add Student" form
- Add "Quick Add Bus" form
- Bulk operations (assign multiple students to bus)

---

### 5. **QR Code / Barcode Scanner**
**Best For:** Attendance-less enrollment, bulk verification
**Tools:** `expo-barcode-scanner`

**Use Cases:**
- Scan student ID cards to register students
- Scan bus QR codes to assign routes
- Verify data accuracy before bulk upload

---

### 6. **Mobile App to Cloud Sync**
**Best For:** Real-time synchronization
**Implementation:**
- Sync via Firebase/Supabase
- Automatic daily backups
- Conflict resolution for simultaneous edits

---

## Recommended Architecture for Your App

### **Phase 1 (Current):**
✅ CSV Upload for Students and Buses
✅ Manual forms for individual entries

### **Phase 2 (Recommended Next):**
- [ ] Enhanced CSV upload with progress indicator
- [ ] Error reporting and validation feedback
- [ ] Template download feature
- [ ] Data preview before upload
- [ ] Undo/Rollback functionality

### **Phase 3 (Advanced):**
- [ ] Excel file support (.xlsx)
- [ ] Google Sheets integration
- [ ] Batch API for large imports
- [ ] Scheduled automated imports

---

## Suggested UI/UX Improvements

### **For Data Upload Screen** (`/mt/data`):

```
┌─────────────────────────────────────┐
│     Upload Student & Bus Data        │
└─────────────────────────────────────┘

📋 Choose Upload Method:
┌──────────────────────────┐
│ 📁 Select CSV File       │  ← Opens file picker
└──────────────────────────┘

📄 CSV Formats:
┌──────────────────────────────────────────────┐
│ Students: ID, Name, Course, Year, Bus, Seat  │
│ Buses: No, Route, Capacity, Driver, Contact  │
└──────────────────────────────────────────────┘

⬇️ Download Templates:
┌──────────────────────────┐
│ [Student CSV Template]   │
│ [Bus CSV Template]       │
└──────────────────────────┘

✅ Recent Uploads:
│ ✓ students_2024-05-08.csv (45 records)
│ ✓ buses_2024-05-07.csv (12 records)
```

---

## API Endpoints to Implement

### **POST /api/bulk/students**
```json
{
  "action": "import",
  "format": "csv",
  "data": [
    {
      "student_id": "STU001",
      "name": "John Doe",
      "course": "B.Tech",
      "year": 1,
      "bus_no": 5,
      "seat": 12
    }
  ]
}

Response:
{
  "success": 45,
  "failed": 2,
  "errors": [
    {"row": 10, "error": "Invalid bus number"},
    {"row": 25, "error": "Duplicate student ID"}
  ]
}
```

### **POST /api/bulk/buses**
```json
{
  "action": "import",
  "format": "csv",
  "data": [
    {
      "bus_no": 1,
      "route": "Main Campus - Town",
      "capacity": 45,
      "driver_name": "Ahmed",
      "driver_contact": "1234567890",
      "conductor_id": "C001"
    }
  ]
}
```

### **GET /api/templates**
Returns CSV templates as downloadable files

### **GET /api/bulk/history**
Returns upload history with success/failure metrics

---

## Best Practices for Bulk Upload

### **Before Upload:**
1. ✅ Validate data in Excel/Sheets first
2. ✅ Check for duplicate IDs
3. ✅ Ensure bus numbers are valid
4. ✅ Verify seat numbers don't exceed bus capacity
5. ✅ Use official CSV templates

### **During Upload:**
1. ✅ Show progress indicator
2. ✅ Display real-time validation feedback
3. ✅ Allow pause/resume
4. ✅ Show row-by-row error details

### **After Upload:**
1. ✅ Generate success/failure report
2. ✅ Allow download of error details
3. ✅ Show option to fix and re-upload failed rows
4. ✅ Provide undo/rollback within 24 hours
5. ✅ Send confirmation email/notification

---

## Sample CSV Templates

### **Students CSV** (students.csv)
```
student_id,name,course,year,bus_no,seat,route
STU001,Rajesh Kumar,B.Tech,1,1,15,Main Campus - Town
STU002,Priya Singh,B.Tech,1,1,16,Main Campus - Town
STU003,Amit Patel,M.Tech,2,5,10,Tech Park - Campus
STU004,Anaya Sharma,BBA,3,3,20,City Center - Campus
```

### **Buses CSV** (buses.csv)
```
bus_no,route,capacity,driver_name,driver_contact,conductor_id,conductor_name
1,Main Campus - Town,45,Ahmed Khan,9876543210,C001,Rajesh Kumar
2,Tech Park - Campus,50,Priya Verma,9876543211,C002,Amit Singh
3,City Center - Campus,40,Vikram Patel,9876543212,C003,Suresh Nair
5,Residential Area - Campus,45,Deepak Roy,9876543213,C004,Karan Malhotra
```

---

## Storage & Performance Considerations

### **File Size Limits:**
- CSV: Up to 10,000 rows (recommended)
- Excel: Up to 50,000 rows (recommended)
- Larger files: Use batch API with pagination

### **Upload Optimization:**
```typescript
// Chunked upload for large files
const chunkSize = 500;
for (let i = 0; i < rows.length; i += chunkSize) {
  const chunk = rows.slice(i, i + chunkSize);
  await uploadChunk(chunk);
}
```

### **Validation Strategy:**
1. Client-side: Quick format check
2. Server-side: Deep validation, business logic
3. Database: Constraints and uniqueness checks

---

## Implementation Roadmap

| Feature | Priority | Effort | Timeline |
|---------|----------|--------|----------|
| CSV Upload Enhancement | High | 2 days | This sprint |
| Error Reporting UI | High | 1 day | This sprint |
| Download Templates | Medium | 0.5 days | Next sprint |
| Excel Support | Medium | 3 days | Next sprint |
| Google Sheets Sync | Low | 5 days | Future |
| QR Scanner | Low | 2 days | Future |
| Rollback Feature | Medium | 2 days | Future |

---

## Example Implementation Snippet

```typescript
// For CSV Upload Handler in /mt/data
async function uploadCSVData(fileUri: string, fileType: 'students' | 'buses') {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type: 'text/csv',
      name: `${fileType}.csv`,
    } as any);

    const response = await fetch(
      `${API_BASE}/api/bulk/${fileType}`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const result = await response.json();
    
    // Show detailed feedback
    Alert.alert(
      'Upload Complete',
      `✓ ${result.success} records uploaded\n` +
      `✗ ${result.failed} records failed\n` +
      `View errors below or download report`,
      [
        { text: 'View Errors', onPress: showErrorDetails },
        { text: 'Download Report', onPress: downloadErrorReport },
        { text: 'OK' },
      ]
    );

    return result;
  } catch (error) {
    console.error('Upload error:', error);
    Alert.alert('Upload Failed', 'Please try again or contact support');
  }
}
```

---

## Security Considerations

1. **File Validation:** Only accept CSV/Excel files
2. **Data Validation:** Sanitize all inputs
3. **Access Control:** Only MTO users can upload
4. **Audit Trail:** Log all uploads with timestamps
5. **Backup:** Create backups before bulk imports
6. **Rate Limiting:** Limit upload frequency
7. **Encryption:** Use HTTPS for file transfers

---

## Support & Documentation

- Create video tutorials for data format
- Provide downloadable template files
- Maintain FAQ for common upload errors
- Offer template builder tool
- Create validation guide document

---

## Questions to Consider

- Should we support automatic daily syncs from a master database?
- Do we need to support partial uploads (skip invalid rows)?
- Should failed uploads be automatically retried?
- Do we need to support scheduled imports at specific times?
- Should we track data change history?

---

**Last Updated:** May 8, 2026
**Version:** 1.0
