import * as XLSX from 'xlsx';
import { ImportPreviewStudent, Student } from '../types';

/**
 * Normalize Vietnamese text for comparison and matching
 */
export function normalizeVietnamese(str: string): string {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Format Excel date serial number or date string into DD/MM/YYYY
 */
export function formatExcelDate(value: any): string {
  if (!value) return '';
  if (typeof value === 'number' && value > 10000 && value < 70000) {
    try {
      const utc_days = Math.floor(value - 25569);
      const utc_value = utc_days * 86400;
      const date_info = new Date(utc_value * 1000);
      const day = String(date_info.getUTCDate()).padStart(2, '0');
      const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
      const year = date_info.getUTCFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return String(value);
    }
  }
  return String(value).trim();
}

/**
 * Clean student name (remove leading numbers like "01. ", "1 - ", etc.)
 */
function cleanStudentName(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/^[\d\s\.\-\–\)\:\/]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a row is a title banner or summary footer rather than a student row
 */
function isIgnoredRow(textRow: string): boolean {
  const norm = normalizeVietnamese(textRow);
  const skipKeywords = [
    'tong so',
    'tong cong',
    'giao vien chu nhiem',
    'hieu truong',
    'nguoi lap bieu',
    'nguoi lap',
    'ban giam hieu',
    'kinh gui',
    'danh sach hoc sinh',
    'nam hoc',
    'hoc ky',
    'so gd&dt',
    'so gddt',
    'phong gd&dt',
    'phong gddt',
    'ubnd',
    'truong thpt',
    'truong thcs',
    'truong tieu hoc',
    'ky ten',
    'ngay thang nam',
    'trang 1',
    'trang 2'
  ];
  return skipKeywords.some(kw => norm.includes(kw));
}

interface ColumnMapping {
  sttCol: number;
  studentCodeCol: number;
  fullNameCol: number;
  lastNameCol: number;
  firstNameCol: number;
  genderCol: number;
  femaleCheckboxCol: number;
  maleCheckboxCol: number;
  teamCol: number;
  dobCol: number;
  phoneCol: number;
  parentNameCol: number;
  notesCol: number;
}

/**
 * Clean and normalize a header cell by stripping parentheses like (nam/nu), (*), (dd/mm/yyyy)
 */
function cleanHeaderNorm(str: string): string {
  let norm = normalizeVietnamese(str);
  norm = norm.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').replace(/[*#:;]/g, '').trim();
  return norm;
}

/**
 * Detect column positions by scanning header cells
 */
function detectColumnsFromRow(row: any[]): ColumnMapping | null {
  const mapping: ColumnMapping = {
    sttCol: -1,
    studentCodeCol: -1,
    fullNameCol: -1,
    lastNameCol: -1,
    firstNameCol: -1,
    genderCol: -1,
    femaleCheckboxCol: -1,
    maleCheckboxCol: -1,
    teamCol: -1,
    dobCol: -1,
    phoneCol: -1,
    parentNameCol: -1,
    notesCol: -1,
  };

  let matchPoints = 0;

  row.forEach((cell, idx) => {
    const raw = String(cell || '').trim();
    if (!raw) return;
    const norm = cleanHeaderNorm(raw);
    const origNorm = normalizeVietnamese(raw);
    if (!norm && !origNorm) return;

    // Student Code (Mã học sinh / Mã định danh / Số định danh / Student ID)
    if (
      norm === 'ma hoc sinh' ||
      norm === 'ma hs' ||
      norm === 'ma dinh danh' ||
      norm === 'ma dinh danh bgd' ||
      norm === 'ma so hoc sinh' ||
      norm === 'ma so hs' ||
      norm === 'ma so' ||
      norm === 'student code' ||
      norm === 'student id' ||
      norm === 'student id no' ||
      norm === 'student number' ||
      norm === 'id hoc sinh' ||
      norm === 'id hs' ||
      norm === 'mssv' ||
      norm === 'ma sv' ||
      norm === 'so the hs' ||
      norm.startsWith('ma hoc sinh') ||
      norm.startsWith('ma hs')
    ) {
      mapping.studentCodeCol = idx;
      matchPoints += 3;
    }
    // Full name
    else if (
      norm === 'ho va ten' ||
      norm === 'ho ten' ||
      norm === 'ho & ten' ||
      norm === 'ten hoc sinh' ||
      norm === 'ho va ten hoc sinh' ||
      norm === 'ho ten hoc sinh' ||
      norm === 'full name' ||
      norm === 'student name' ||
      norm === 'ho va ten khai sinh' ||
      norm === 'ho ten khai sinh' ||
      norm === 'ho va ten hs'
    ) {
      mapping.fullNameCol = idx;
      matchPoints += 3;
    }
    // Split last name (Họ và chữ đệm)
    else if (
      norm.includes('ho va chu dem') ||
      norm.includes('ho va ten dem') ||
      norm.includes('ho va dem') ||
      norm === 'ho dem' ||
      norm === 'ho lot' ||
      norm === 'ho' ||
      norm === 'last name' ||
      norm === 'surname'
    ) {
      mapping.lastNameCol = idx;
      matchPoints += 2;
    }
    // Split first name (Tên)
    else if (norm === 'ten' || norm === 'ten goi' || norm === 'first name' || norm === 'given name') {
      mapping.firstNameCol = idx;
      matchPoints += 2;
    }
    // STT
    else if (
      norm === 'stt' ||
      norm === 'so thu tu' ||
      norm === 'tt' ||
      norm === 'no' ||
      norm === 'no.' ||
      norm === 'index' ||
      norm === 'stt.'
    ) {
      mapping.sttCol = idx;
      matchPoints += 2;
    }
    // Gender
    else if (
      norm === 'gioi tinh' ||
      norm === 'gioi' ||
      norm === 'phai' ||
      norm === 'nam/nu' ||
      norm === 'nam / nu' ||
      norm === 'gender' ||
      norm === 'sex' ||
      norm.includes('gioi tinh')
    ) {
      mapping.genderCol = idx;
      matchPoints += 2;
    }
    // Separate Female column
    else if (norm === 'nu' || norm === 'female' || norm === 'gai' || norm === 'f') {
      mapping.femaleCheckboxCol = idx;
      matchPoints += 1;
    }
    // Separate Male column
    else if (norm === 'nam' || norm === 'male' || norm === 'trai' || norm === 'm') {
      mapping.maleCheckboxCol = idx;
      matchPoints += 1;
    }
    // Team / Group
    else if (
      norm === 'to' ||
      norm === 'to thi dua' ||
      norm === 'nhom' ||
      norm === 'to / nhom' ||
      norm === 'to sinh hoat' ||
      norm === 'to hoc tap' ||
      norm === 'to cn' ||
      norm === 'team' ||
      norm === 'group' ||
      norm.startsWith('to ') ||
      norm.startsWith('to-')
    ) {
      mapping.teamCol = idx;
      matchPoints += 2;
    }
    // Parent Name
    else if (
      norm.includes('ho ten phu huynh') ||
      norm.includes('ten phu huynh') ||
      norm.includes('ten bo me') ||
      norm.includes('cha me') ||
      norm.includes('nguoi giam ho') ||
      norm === 'phu huynh' ||
      norm === 'parent name'
    ) {
      mapping.parentNameCol = idx;
      matchPoints += 2;
    }
    // Date of birth
    else if (
      norm.includes('ngay sinh') ||
      norm.includes('nam sinh') ||
      norm.includes('ngay thang nam sinh') ||
      norm === 'dob' ||
      norm === 'birth date' ||
      norm === 'birthday' ||
      norm === 'date of birth'
    ) {
      mapping.dobCol = idx;
      matchPoints += 2;
    }
    // Phone
    else if (
      (norm.includes('sdt') ||
        norm.includes('dien thoai') ||
        norm.includes('phone') ||
        norm.includes('lien he') ||
        norm.includes('lien lac') ||
        norm.includes('mobile')) &&
      !norm.includes('ten')
    ) {
      mapping.phoneCol = idx;
      matchPoints += 1;
    }
    // Notes / Roles
    else if (
      norm.includes('ghi chu') ||
      norm.includes('chuc vu') ||
      norm.includes('nhiem vu') ||
      norm.includes('nhan xet') ||
      norm === 'note' ||
      norm === 'notes' ||
      norm === 'remark' ||
      norm === 'remarks'
    ) {
      mapping.notesCol = idx;
      matchPoints += 1;
    }
  });

  // A row is considered a header if it matches at least one name column or multiple metadata columns
  const hasName = mapping.fullNameCol !== -1 || (mapping.lastNameCol !== -1 && mapping.firstNameCol !== -1);
  const hasCodeOrStt = mapping.studentCodeCol !== -1 || mapping.sttCol !== -1;
  const hasSecondary = mapping.genderCol !== -1 || mapping.teamCol !== -1 || mapping.dobCol !== -1 || mapping.femaleCheckboxCol !== -1;

  if (hasName || (hasCodeOrStt && hasSecondary) || matchPoints >= 4) {
    return mapping;
  }

  return null;
}

/**
 * Parse a 2D matrix of cells into ImportPreviewStudent list
 */
export function parseRawMatrix(
  matrix: any[][],
  existingStudents: Student[] = []
): {
  students: ImportPreviewStudent[];
  totalRows: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  duplicateCount: number;
} {
  if (!matrix || matrix.length === 0) {
    throw new Error('Dữ liệu rỗng hoặc không tìm thấy hàng nào.');
  }

  const existingMap = new Map<string, Student>();
  existingStudents.forEach(s => {
    existingMap.set(normalizeVietnamese(s.fullName), s);
  });

  // 1. Locate the Header Row (search within first 25 rows)
  let headerRowIndex = -1;
  let colMap: ColumnMapping | null = null;

  for (let r = 0; r < Math.min(matrix.length, 25); r++) {
    const row = matrix[r];
    if (!Array.isArray(row) || row.length === 0) continue;
    const detected = detectColumnsFromRow(row);
    if (detected) {
      headerRowIndex = r;
      colMap = detected;

      // Check if next row contains sub-headers (e.g., Nam/Nữ split under Giới tính)
      const nextRow = matrix[r + 1];
      if (nextRow && Array.isArray(nextRow)) {
        const hasSubGender = nextRow.some(c => {
          const n = cleanHeaderNorm(String(c || ''));
          return n === 'nam' || n === 'nu' || n === 'male' || n === 'female';
        });
        if (hasSubGender) {
          nextRow.forEach((c, idx) => {
            const n = cleanHeaderNorm(String(c || ''));
            if (n === 'nu' || n === 'female' || n === 'gai') colMap!.femaleCheckboxCol = idx;
            if (n === 'nam' || n === 'male' || n === 'trai') colMap!.maleCheckboxCol = idx;
          });
          headerRowIndex = r + 1; // Skip the subheader row
        }
      }
      break;
    }
  }

  // Fallback: If no explicit header row found, guess columns by scanning the first non-empty row
  if (headerRowIndex === -1 || !colMap) {
    // Find the first non-empty row to inspect column layout
    const sampleRow = matrix.find(r => Array.isArray(r) && r.some(c => String(c || '').trim().length > 0)) || [];
    const nonEmptyCount = sampleRow.filter(c => String(c || '').trim().length > 0).length;

    if (nonEmptyCount <= 1) {
      // Single column list (e.g. pasted plain list of student names)
      colMap = {
        sttCol: -1,
        studentCodeCol: -1,
        fullNameCol: 0,
        lastNameCol: -1,
        firstNameCol: -1,
        genderCol: -1,
        femaleCheckboxCol: -1,
        maleCheckboxCol: -1,
        teamCol: -1,
        dobCol: -1,
        phoneCol: -1,
        parentNameCol: -1,
        notesCol: -1,
      };
    } else {
      const firstCell = String(sampleRow[0] || '').trim();
      const isCol0Num = /^\d+$/.test(firstCell);
      colMap = {
        sttCol: isCol0Num ? 0 : -1,
        studentCodeCol: -1,
        fullNameCol: isCol0Num ? 1 : 0,
        lastNameCol: -1,
        firstNameCol: -1,
        genderCol: isCol0Num ? 2 : 1,
        femaleCheckboxCol: -1,
        maleCheckboxCol: -1,
        teamCol: isCol0Num ? 3 : 2,
        dobCol: -1,
        phoneCol: -1,
        parentNameCol: -1,
        notesCol: isCol0Num ? 4 : 3,
      };
    }
    headerRowIndex = -1; // Start from row 0
  }

  const dataRows = matrix.slice(headerRowIndex + 1);
  const previewList: ImportPreviewStudent[] = [];
  let validCount = 0;
  let warningCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;

  dataRows.forEach((row, rowIdx) => {
    if (!Array.isArray(row) || row.length === 0) return;

    // Check if entire row is blank
    const rowString = row.map(c => String(c || '').trim()).join(' ');
    if (!rowString) return;

    // Skip summary / banner / footer rows
    if (isIgnoredRow(rowString)) {
      return;
    }

    // Extract raw values
    let rawName = '';
    if (colMap.lastNameCol !== -1 && colMap.firstNameCol !== -1) {
      const ho = String(row[colMap.lastNameCol] || '').trim();
      const ten = String(row[colMap.firstNameCol] || '').trim();
      rawName = `${ho} ${ten}`.trim();
    } else if (colMap.fullNameCol !== -1 && row[colMap.fullNameCol] !== undefined && String(row[colMap.fullNameCol]).trim().length > 0) {
      rawName = String(row[colMap.fullNameCol]).trim();
    } else if (colMap.firstNameCol !== -1 && row[colMap.firstNameCol] !== undefined && String(row[colMap.firstNameCol]).trim().length > 0) {
      rawName = String(row[colMap.firstNameCol]).trim();
    }

    // If still empty, look through all cells for a plausible name
    if (!rawName) {
      for (const c of row) {
        const str = String(c || '').trim();
        if (str.length >= 2 && !/^\d+$/.test(str) && !/^(nam|nữ|nu|male|female)$/i.test(str) && !isIgnoredRow(str)) {
          rawName = str;
          break;
        }
      }
    }

    // Clean name
    rawName = cleanStudentName(rawName);

    // Skip row if it looks like empty or a header repeated
    if (!rawName || rawName.length < 2) {
      // Check if STT and Team exist
      const hasAny = row.some(c => String(c || '').trim().length > 0);
      if (!hasAny) return;
    }

    // Skip if name is literally "Họ và tên" or "Họ tên" (repeated header)
    const normName = normalizeVietnamese(rawName);
    if (normName === 'ho va ten' || normName === 'ho ten' || normName === 'stt' || normName === 'ma hs' || normName === 'ma hoc sinh') {
      return;
    }

    // STT
    let stt = rowIdx + 1;
    if (colMap.sttCol !== -1 && row[colMap.sttCol] !== undefined) {
      const parsedStt = parseInt(String(row[colMap.sttCol]).trim(), 10);
      if (!isNaN(parsedStt)) {
        stt = parsedStt;
      }
    }

    // Student Code (Mã học sinh)
    let studentCode = '';
    if (colMap.studentCodeCol !== -1 && row[colMap.studentCodeCol] !== undefined) {
      let codeRaw = String(row[colMap.studentCodeCol] || '').trim();
      if (/^\d+\.0$/.test(codeRaw)) {
        codeRaw = codeRaw.replace(/\.0$/, '');
      }
      studentCode = codeRaw;
    }

    // Gender
    let gender: 'male' | 'female' | 'other' = 'male';
    if (colMap.femaleCheckboxCol !== -1) {
      const femaleVal = String(row[colMap.femaleCheckboxCol] || '').trim().toLowerCase();
      if (femaleVal === 'x' || femaleVal === '1' || femaleVal === 'v' || femaleVal === 'true' || femaleVal.includes('nu')) {
        gender = 'female';
      }
    } else if (colMap.genderCol !== -1) {
      const gStr = normalizeVietnamese(String(row[colMap.genderCol] || ''));
      if (gStr.includes('nu') || gStr.includes('female') || gStr.includes('gai') || gStr === 'f' || gStr === '0' || gStr === '2') {
        gender = 'female';
      } else if (gStr.includes('khac') || gStr.includes('other')) {
        gender = 'other';
      }
    }

    // Team
    let teamName = 'Tổ 1';
    let rawTeam = '';
    let hasTeamWarning = false;

    if (colMap.teamCol !== -1 && row[colMap.teamCol] !== undefined) {
      rawTeam = String(row[colMap.teamCol]).trim();
      const numMatch = rawTeam.match(/\d+/);
      if (numMatch) {
        const num = parseInt(numMatch[0], 10);
        teamName = `Tổ ${num >= 1 && num <= 8 ? num : ((rowIdx % 4) + 1)}`;
      } else if (normalizeVietnamese(rawTeam).includes('to') || normalizeVietnamese(rawTeam).includes('nhom')) {
        teamName = rawTeam;
      } else if (rawTeam) {
        hasTeamWarning = true;
        teamName = `Tổ ${(rowIdx % 4) + 1}`;
      } else {
        teamName = `Tổ ${(rowIdx % 4) + 1}`;
      }
    } else {
      teamName = `Tổ ${(rowIdx % 4) + 1}`;
    }

    // DOB & Phone & Parent Name
    const birthDate = colMap.dobCol !== -1 ? formatExcelDate(row[colMap.dobCol]) : undefined;
    const parentPhone = colMap.phoneCol !== -1 ? String(row[colMap.phoneCol] || '').trim() : undefined;
    let parentName = '';
    if (colMap.parentNameCol !== -1 && row[colMap.parentNameCol] !== undefined) {
      parentName = cleanStudentName(String(row[colMap.parentNameCol] || '').trim());
    }

    // Notes
    let notes = '';
    if (colMap.notesCol !== -1 && row[colMap.notesCol] !== undefined) {
      notes = String(row[colMap.notesCol]).trim();
    }

    // Validate
    let status: 'valid' | 'warning' | 'error' | 'duplicate' = 'valid';
    let errorMessage = '';
    let duplicateAction: 'skip' | 'update' | 'create_new' = 'skip';
    let existingStudentId: string | undefined;

    if (!rawName || rawName.length < 2) {
      status = 'error';
      errorMessage = 'Thiếu họ và tên học sinh';
      errorCount++;
    } else {
      const norm = normalizeVietnamese(rawName);
      if (existingMap.has(norm)) {
        status = 'duplicate';
        const existing = existingMap.get(norm)!;
        existingStudentId = existing.studentId;
        errorMessage = `Học sinh "${rawName}" đã có trong danh sách (${existing.teamName})`;
        duplicateAction = 'skip';
        duplicateCount++;
      } else if (hasTeamWarning) {
        status = 'warning';
        errorMessage = `Tổ "${rawTeam}" chưa chuẩn, đã gán tạm vào ${teamName}`;
        warningCount++;
      } else {
        validCount++;
      }
    }

    previewList.push({
      stt,
      studentCode: studentCode || undefined,
      fullName: rawName,
      gender,
      teamName,
      birthDate: birthDate || '',
      parentPhone: parentPhone || '',
      parentName: parentName || '',
      notes,
      status,
      errorMessage,
      duplicateAction,
      existingStudentId
    });
  });

  return {
    students: previewList,
    totalRows: previewList.length,
    validCount,
    warningCount,
    errorCount,
    duplicateCount
  };
}

/**
 * Parse an Excel (.xlsx, .xls) or CSV file with intelligent multi-sheet and header detection
 */
export async function parseStudentFile(
  file: File,
  existingStudents: Student[] = []
): Promise<{
  students: ImportPreviewStudent[];
  totalRows: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  duplicateCount: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('File không chứa trang tính (sheet) nào.');
        }

        // Try sheets to find the one with actual data
        let bestResult: ReturnType<typeof parseRawMatrix> | null = null;

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) continue;

          // Convert to 2D array of cells
          const matrix: any[][] = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: '',
            blankrows: false
          });

          if (matrix && matrix.length > 0) {
            const result = parseRawMatrix(matrix, existingStudents);
            if (!bestResult || result.validCount > bestResult.validCount || (result.totalRows > bestResult.totalRows && bestResult.validCount === 0)) {
              bestResult = result;
            }
            if (result.validCount > 0) {
              break;
            }
          }
        }

        if (!bestResult || bestResult.totalRows === 0) {
          throw new Error('File không chứa dữ liệu học sinh hoặc các cột chưa đúng định dạng.');
        }

        resolve(bestResult);
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('Không thể đọc tệp tin đã chọn. Vui lòng kiểm tra lại file.'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse directly pasted text (from Excel, Google Sheets, Zalo, Word table)
 */
export function parseStudentText(
  pastedText: string,
  existingStudents: Student[] = []
): {
  students: ImportPreviewStudent[];
  totalRows: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  duplicateCount: number;
} {
  const lines = pastedText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    throw new Error('Chưa có nội dung danh sách được dán.');
  }

  // Detect delimiter: tab '\t', semicolon ';', or comma ','
  const matrix: any[][] = lines.map(line => {
    if (line.includes('\t')) {
      return line.split('\t').map(c => c.trim());
    }
    if (line.includes(';')) {
      return line.split(';').map(c => c.trim());
    }
    if (line.includes(',')) {
      return line.split(',').map(c => c.trim());
    }
    return [line.trim()];
  });

  return parseRawMatrix(matrix, existingStudents);
}

/**
 * Generate standard downloadable Excel template
 */
export function downloadStudentTemplateExcel(className: string = '5A1'): void {
  const sampleData = [
    {
      'STT': 1,
      'Mã học sinh': 'HS001',
      'Họ và tên': 'Nguyễn Minh Anh',
      'Giới tính': 'Nam',
      'Ngày sinh': '15/09/2012',
      'Tổ': 'Tổ 1',
      'SĐT phụ huynh': '0987654321',
      'Họ tên phụ huynh': 'Nguyễn Văn Hùng',
      'Ghi chú': 'Lớp trưởng, gương mẫu tích cực'
    },
    {
      'STT': 2,
      'Mã học sinh': 'HS002',
      'Họ và tên': 'Trần Gia Bảo',
      'Giới tính': 'Nam',
      'Ngày sinh': '20/11/2012',
      'Tổ': 'Tổ 1',
      'SĐT phụ huynh': '0976543210',
      'Họ tên phụ huynh': 'Trần Văn Bình',
      'Ghi chú': 'Tổ trưởng Tổ 1'
    },
    {
      'STT': 3,
      'Mã học sinh': 'HS003',
      'Họ và tên': 'Lê Thùy Chi',
      'Giới tính': 'Nữ',
      'Ngày sinh': '08/03/2012',
      'Tổ': 'Tổ 2',
      'SĐT phụ huynh': '0912345678',
      'Họ tên phụ huynh': 'Nguyễn Thị Mai',
      'Ghi chú': 'Lớp phó học tập'
    },
    {
      'STT': 4,
      'Mã học sinh': 'HS004',
      'Họ và tên': 'Phạm Hoàng Dũng',
      'Giới tính': 'Nam',
      'Ngày sinh': '12/05/2012',
      'Tổ': 'Tổ 2',
      'SĐT phụ huynh': '0934567890',
      'Họ tên phụ huynh': 'Phạm Đức Long',
      'Ghi chú': ''
    },
    {
      'STT': 5,
      'Mã học sinh': 'HS005',
      'Họ và tên': 'Hoàng Khánh Linh',
      'Giới tính': 'Nữ',
      'Ngày sinh': '19/10/2012',
      'Tổ': 'Tổ 3',
      'SĐT phụ huynh': '0945678901',
      'Họ tên phụ huynh': 'Hoàng Văn Tuấn',
      'Ghi chú': ''
    },
    {
      'STT': 6,
      'Mã học sinh': 'HS006',
      'Họ và tên': 'Võ Quốc Huy',
      'Giới tính': 'Nam',
      'Ngày sinh': '25/08/2012',
      'Tổ': 'Tổ 4',
      'SĐT phụ huynh': '0901234567',
      'Họ tên phụ huynh': 'Võ Văn Hậu',
      'Ghi chú': ''
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 8 },  // STT
    { wch: 14 }, // Mã học sinh
    { wch: 26 }, // Họ và tên
    { wch: 12 }, // Giới tính
    { wch: 14 }, // Ngày sinh
    { wch: 12 }, // Tổ
    { wch: 16 }, // SĐT phụ huynh
    { wch: 22 }, // Họ tên phụ huynh
    { wch: 35 }  // Ghi chú
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách học sinh');

  // Export
  XLSX.writeFile(workbook, `Mau_Danh_Sach_Hoc_Sinh_${className}.xlsx`);
}

export const generateStudentImportTemplate = downloadStudentTemplateExcel;
