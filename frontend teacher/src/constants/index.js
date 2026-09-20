export const ROLES = {
    STUDENT: 'student',
    TEACHER: 'teacher',
    ADMIN: 'admin'
};

export const THESIS_STATUS = {
    CHUA_NOP: 'Chưa nộp',
    DA_NOP: 'Đã nộp',
    DANG_DUYET: 'Đang duyệt',
    DA_DUYET: 'Đã duyệt',
    YEU_CAU_SUA: 'Yêu cầu sửa'
};

export const GRADE_SCALE = {
    A_PLUS: { min: 9.0, max: 10.0, gpa4: 4.0, letter: 'A+' },
    A: { min: 8.5, max: 8.9, gpa4: 3.7, letter: 'A' },
    B_PLUS: { min: 8.0, max: 8.4, gpa4: 3.5, letter: 'B+' },
    B: { min: 7.0, max: 7.9, gpa4: 3.0, letter: 'B' },
    C_PLUS: { min: 6.5, max: 6.9, gpa4: 2.5, letter: 'C+' },
    C: { min: 5.5, max: 6.4, gpa4: 2.0, letter: 'C' },
    D_PLUS: { min: 5.0, max: 5.4, gpa4: 1.5, letter: 'D+' },
    D: { min: 4.0, max: 4.9, gpa4: 1.0, letter: 'D' },
    F: { min: 0.0, max: 3.9, gpa4: 0.0, letter: 'F' }
};
