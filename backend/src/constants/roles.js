const ROLES = {
    STUDENT: 'student',
    TEACHER: 'teacher',
    ADMIN: 'admin'
};

const ROLE_PERMISSIONS = {
    [ROLES.STUDENT]: ['view_own_grades', 'submit_thesis', 'view_schedule', 'appeal_grade'],
    [ROLES.TEACHER]: ['grade_students', 'manage_theses', 'view_classes', 'attendance'],
    [ROLES.ADMIN]: ['manage_users', 'manage_curriculum', 'manage_system', 'view_reports', 'seed_data']
};

module.exports = {
    ROLES,
    ROLE_PERMISSIONS
};
