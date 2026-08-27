require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

const User = require('../models/User');
const Course = require('../models/Course');
const ClassSection = require('../models/ClassSection');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');
const ExamSchedule = require('../models/ExamSchedule');
const Survey = require('../models/Survey');
const Submission = require('../models/Submission');
const Internship = require('../models/Internship');
const Thesis = require('../models/Thesis');
const Announcement = require('../models/Announcement');

const connectDB = require('../config/db');

const seedDB = async () => {
    try {
        console.log('Đang kết nối MongoDB...');
        await connectDB();
        console.log('Đã kết nối MongoDB. Đang dọn dẹp dữ liệu cũ...');

        await Promise.all([
            User.deleteMany({}),
            Course.deleteMany({}),
            ClassSection.deleteMany({}),
            Attendance.deleteMany({}),
            Grade.deleteMany({}),
            ExamSchedule.deleteMany({}),
            Survey.deleteMany({}),
            Submission.deleteMany({}),
            Internship.deleteMany({}),
            Thesis.deleteMany({}),
            Announcement.deleteMany({})
        ]);

        console.log('Dọn dẹp thành công. Đang nạp dữ liệu mẫu...');

        // 1. Tạo Người dùng (Admin, Giảng viên, Sinh viên)
        const users = await User.create([
            {
                code: 'AD001',
                name: 'PGS. TS. Nguyễn Văn Quản Trị',
                email: 'admin@university.edu.vn',
                password: '123',
                role: 'admin',
                department: 'Phòng Đào tạo & Quản trị',
                avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80'
            },
            {
                code: 'GV001',
                name: 'TS. Trần Minh Đức',
                email: 'duc.tm@university.edu.vn',
                password: '123',
                role: 'teacher',
                department: 'Công nghệ thông tin',
                phone: '0901234567',
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
            },
            {
                code: 'GV002',
                name: 'ThS. Lê Hoàng Yến',
                email: 'yen.lh@university.edu.vn',
                password: '123',
                role: 'teacher',
                department: 'Khoa học máy tính',
                phone: '0909876543',
                avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80'
            },
            {
                code: 'SV001',
                name: 'Trần Phạm Kim Phúc',
                email: 'phuc.tpk@student.edu.vn',
                password: '123',
                role: 'student',
                department: 'Công nghệ thông tin',
                major: 'Kỹ thuật phần mềm',
                classCode: 'K17-CNTT01',
                academicYear: '2023-2027',
                phone: '0912334455',
                avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
            },
            {
                code: 'SV002',
                name: 'Nguyễn Thị Thu Hà',
                email: 'ha.ntt@student.edu.vn',
                password: '123',
                role: 'student',
                department: 'Công nghệ thông tin',
                major: 'Kỹ thuật phần mềm',
                classCode: 'K17-CNTT01',
                academicYear: '2023-2027',
                phone: '0988776655',
                avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80'
            },
            {
                code: 'SV003',
                name: 'Lê Quốc Bảo',
                email: 'bao.lq@student.edu.vn',
                password: '123',
                role: 'student',
                department: 'Khoa học máy tính',
                major: 'Trí tuệ nhân tạo',
                classCode: 'K17-AI01',
                academicYear: '2023-2027',
                phone: '0977665544',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'
            },
            {
                code: 'SV004',
                name: 'Võ Hoàng Nam',
                email: 'nam.vh@student.edu.vn',
                password: '123',
                role: 'student',
                department: 'Công nghệ thông tin',
                major: 'An toàn thông tin',
                classCode: 'K17-ATTT01',
                academicYear: '2023-2027',
                phone: '0966554433',
                avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80'
            }
        ]);

        const [admin, teacher1, teacher2, student1, student2, student3, student4] = users;

        // 2. Tạo Môn học (Courses)
        const courses = await Course.create([
            {
                code: 'IT301',
                name: 'Lập trình Web nâng cao & Node.js',
                credits: 3,
                department: 'Công nghệ thông tin',
                description: 'Xây dựng RESTful API chuẩn REST, Microservices và tối ưu bảo mật Backend.',
                tuitionFeePerCredit: 450000
            },
            {
                code: 'IT302',
                name: 'Cơ sở dữ liệu nâng cao & MongoDB',
                credits: 3,
                department: 'Công nghệ thông tin',
                description: 'Thiết kế cơ sở dữ liệu NoSQL, Sharding, Indexing và tối ưu truy vấn.',
                tuitionFeePerCredit: 450000
            },
            {
                code: 'IT303',
                name: 'Kiến trúc phần mềm & DevOps',
                credits: 4,
                department: 'Kỹ thuật phần mềm',
                description: 'Mô hình MVC, Clean Architecture, CI/CD và triển khai Docker.',
                tuitionFeePerCredit: 450000
            },
            {
                code: 'AI201',
                name: 'Trí tuệ nhân tạo & Xử lý ngôn ngữ',
                credits: 3,
                department: 'Khoa học máy tính',
                description: 'Thuật toán Machine Learning, Xử lý văn bản và đối chiếu dữ liệu.',
                tuitionFeePerCredit: 450000
            }
        ]);

        const [course1, course2, course3, course4] = courses;

        // 3. Tạo Lớp học phần (Class Sections & Thời khóa biểu)
        const sections = await ClassSection.create([
            {
                sectionCode: 'LHP_IT301_01',
                course: course1._id,
                teacher: teacher1._id,
                semester: 'HK1-2026-2027',
                academicYear: '2026-2027',
                students: [student1._id, student2._id, student3._id, student4._id],
                room: 'Phòng Lab 402',
                dayOfWeek: 2, // Thứ Hai
                shift: 'Ca 1 (07:30 - 10:00)',
                startPeriod: 1,
                endPeriod: 3,
                totalLessons: 15
            },
            {
                sectionCode: 'LHP_IT302_01',
                course: course2._id,
                teacher: teacher2._id,
                semester: 'HK1-2026-2027',
                academicYear: '2026-2027',
                students: [student1._id, student2._id, student3._id],
                room: 'Phòng Lab 501',
                dayOfWeek: 4, // Thứ Tư
                shift: 'Ca 2 (10:15 - 12:45)',
                startPeriod: 4,
                endPeriod: 6,
                totalLessons: 15
            },
            {
                sectionCode: 'LHP_IT303_01',
                course: course3._id,
                teacher: teacher1._id,
                semester: 'HK1-2026-2027',
                academicYear: '2026-2027',
                students: [student1._id, student4._id],
                room: 'Phòng Hội thảo B202',
                dayOfWeek: 6, // Thứ Sáu
                shift: 'Ca 3 (13:30 - 16:00)',
                startPeriod: 7,
                endPeriod: 9,
                totalLessons: 15
            }
        ]);

        const [section1, section2, section3] = sections;

        // 4. Tạo Dữ liệu Điểm danh & Chuyên cần (Attendance)
        await Attendance.create([
            {
                classSection: section1._id,
                sessionNumber: 1,
                date: '2026-08-03',
                records: [
                    { student: student1._id, status: 'present', note: 'Đúng giờ' },
                    { student: student2._id, status: 'present', note: 'Đúng giờ' },
                    { student: student3._id, status: 'late', note: 'Muộn 10p' },
                    { student: student4._id, status: 'excused_absent', note: 'Có đơn phép' }
                ],
                takenBy: teacher1._id
            },
            {
                classSection: section1._id,
                sessionNumber: 2,
                date: '2026-08-10',
                records: [
                    { student: student1._id, status: 'present', note: '' },
                    { student: student2._id, status: 'present', note: '' },
                    { student: student3._id, status: 'present', note: '' },
                    { student: student4._id, status: 'unexcused_absent', note: 'Vắng không lý do' }
                ],
                takenBy: teacher1._id
            },
            {
                classSection: section1._id,
                sessionNumber: 3,
                date: '2026-08-17',
                records: [
                    { student: student1._id, status: 'present', note: '' },
                    { student: student2._id, status: 'late', note: 'Muộn 5p' },
                    { student: student3._id, status: 'present', note: '' },
                    { student: student4._id, status: 'unexcused_absent', note: 'Vắng không lý do' }
                ],
                takenBy: teacher1._id
            }
        ]);

        // 5. Tạo Bảng điểm (Grades)
        await Grade.create([
            {
                student: student1._id,
                classSection: section1._id,
                course: course1._id,
                attendanceScore: 10,
                midtermScore: 9.0,
                finalScore: 9.5,
                semester: 'HK1-2026-2027'
            },
            {
                student: student1._id,
                classSection: section2._id,
                course: course2._id,
                attendanceScore: 9.5,
                midtermScore: 8.5,
                finalScore: 9.0,
                semester: 'HK1-2026-2027'
            },
            {
                student: student1._id,
                classSection: section3._id,
                course: course3._id,
                attendanceScore: 10,
                midtermScore: 9.0,
                finalScore: 8.5,
                semester: 'HK1-2026-2027'
            },
            {
                student: student2._id,
                classSection: section1._id,
                course: course1._id,
                attendanceScore: 9.0,
                midtermScore: 8.0,
                finalScore: 8.0,
                semester: 'HK1-2026-2027'
            },
            {
                student: student3._id,
                classSection: section1._id,
                course: course1._id,
                attendanceScore: 7.5,
                midtermScore: 7.0,
                finalScore: 6.5,
                semester: 'HK1-2026-2027'
            },
            {
                student: student4._id,
                classSection: section1._id,
                course: course1._id,
                attendanceScore: 4.0,
                midtermScore: 5.0,
                finalScore: 4.5,
                semester: 'HK1-2026-2027'
            }
        ]);

        // 6. Tạo Lịch thi & Phòng thi (Exam Schedules)
        await ExamSchedule.create([
            {
                course: course1._id,
                classSection: section1._id,
                examDate: '2026-09-15',
                startTime: '07:30',
                endTime: '09:30',
                room: 'Hội trường C101',
                examType: 'Cuối kỳ',
                format: 'Thực hành máy tính',
                proctors: [teacher1._id],
                students: [student1._id, student2._id, student3._id, student4._id],
                maxCapacity: 45
            },
            {
                course: course2._id,
                classSection: section2._id,
                examDate: '2026-09-18',
                startTime: '13:30',
                endTime: '15:00',
                room: 'Phòng Thi A302',
                examType: 'Cuối kỳ',
                format: 'Tự luận',
                proctors: [teacher2._id],
                students: [student1._id, student2._id, student3._id],
                maxCapacity: 40
            }
        ]);

        // 7. Tạo Khảo sát & Đánh giá Giảng dạy (Surveys)
        await Survey.create([
            {
                title: 'Khảo sát chất lượng giảng dạy môn Lập trình Web nâng cao & Node.js',
                classSection: section1._id,
                teacher: teacher1._id,
                course: course1._id,
                semester: 'HK1-2026-2027',
                isOpen: true,
                responses: [
                    {
                        teachingMethodRating: 5,
                        knowledgeRating: 5,
                        punctualityRating: 5,
                        fairnessRating: 5,
                        overallRating: 5,
                        feedback: 'Thầy giảng rất dễ hiểu, demo code thực tế và hỗ trợ sinh viên nhiệt tình!'
                    },
                    {
                        teachingMethodRating: 4,
                        knowledgeRating: 5,
                        punctualityRating: 5,
                        fairnessRating: 4,
                        overallRating: 4.5,
                        feedback: 'Nội dung môn học rất thực tế, bài tập lớn giúp nâng cao tay nghề lập trình.'
                    }
                ]
            },
            {
                title: 'Khảo sát chất lượng giảng dạy môn Cơ sở dữ liệu nâng cao & MongoDB',
                classSection: section2._id,
                teacher: teacher2._id,
                course: course2._id,
                semester: 'HK1-2026-2027',
                isOpen: true,
                responses: [
                    {
                        teachingMethodRating: 5,
                        knowledgeRating: 5,
                        punctualityRating: 4,
                        fairnessRating: 5,
                        overallRating: 4.8,
                        feedback: 'Cô hướng dẫn thiết kế cơ sở dữ liệu rất chi tiết, chuẩn chỉ.'
                    }
                ]
            }
        ]);

        // 8. Tạo Dữ liệu Kiểm tra trùng lặp & Chống gian lận (Plagiarism Submissions)
        const docTextOriginal = 'Kiến trúc hệ thống hướng dịch vụ Node.js và MongoDB cung cấp khả năng xử lý bất đồng bộ mạnh mẽ, hỗ trợ mở rộng quy mô lớn cho ứng dụng quản lý sinh viên hiện đại.';
        const docTextPlagiarized = 'Kiến trúc hệ thống hướng dịch vụ Node.js và MongoDB cung cấp khả năng xử lý bất đồng bộ mạnh mẽ, hỗ trợ mở rộng quy mô lớn cho ứng dụng quản lý trường học.';

        await Submission.create([
            {
                student: student1._id,
                title: 'Báo cáo kiến trúc hệ thống Back-end Microservices',
                assignmentType: 'Bài tập lớn',
                fileName: 'BaoCao_KienTruc_NodeJS.docx',
                fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                contentSummary: docTextOriginal,
                wordCount: 28,
                maxSimilarityPercentage: 8.5,
                fraudAlertLevel: 'An toàn',
                matches: []
            },
            {
                student: student3._id,
                title: 'Báo cáo ứng dụng Node.js trong quản lý dữ liệu',
                assignmentType: 'Bài tập lớn',
                fileName: 'BaoCao_NodeJS_Data.docx',
                fileHash: 'a7b3c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852c999',
                contentSummary: docTextPlagiarized,
                wordCount: 26,
                maxSimilarityPercentage: 88.2,
                fraudAlertLevel: 'Gian lận nghiêm trọng',
                matches: [
                    {
                        matchedStudentName: 'Trần Phạm Kim Phúc',
                        similarityPercentage: 88.2,
                        matchedKeywords: ['kiến trúc hệ thống', 'dịch vụ node.js', 'bất đồng bộ', 'quản lý'],
                        isExactHashMatch: false
                    }
                ]
            }
        ]);

        // 9. Tạo Quản lý Thực tập và Việc làm (Internships)
        await Internship.create([
            {
                student: student1._id,
                companyName: 'FPT Software Corporation',
                position: 'Backend Developer Intern (Node.js/Go)',
                mentorName: 'Nguyễn Tuấn Anh (Solution Architect)',
                mentorEmail: 'anhnt@fsoft.com.vn',
                academicAdvisor: teacher1._id,
                startDate: '2026-06-01',
                endDate: '2026-08-30',
                salary: '8.000.000 VNĐ / tháng',
                status: 'Đã hoàn thành',
                companyEvaluationScore: 9.5,
                advisorScore: 9.0,
                finalGrade: 9.3,
                isEmployedAfterInternship: true,
                feedback: 'Sinh viên hoàn thành xuất sắc các task phát triển API, tác phong chuyên nghiệp, đã nhận ký hợp đồng làm việc chính thức.'
            },
            {
                student: student2._id,
                companyName: 'VNG Corporation - ZaloPay',
                position: 'Software Engineer Intern',
                mentorName: 'Lê Minh Quân',
                mentorEmail: 'quanlm@vng.com.vn',
                academicAdvisor: teacher2._id,
                startDate: '2026-06-01',
                endDate: '2026-08-30',
                salary: '9.000.000 VNĐ / tháng',
                status: 'Đã hoàn thành',
                companyEvaluationScore: 9.0,
                advisorScore: 8.5,
                finalGrade: 8.8,
                isEmployedAfterInternship: true,
                feedback: 'Kỹ năng giải thuật tốt, chủ động trong công việc.'
            },
            {
                student: student4._id,
                companyName: 'Tập đoàn Viettel - Viettel Cyber Security',
                position: 'Security Analyst Intern',
                mentorName: 'Phạm Hồng Sơn',
                mentorEmail: 'sonph@viettel.com.vn',
                academicAdvisor: teacher1._id,
                startDate: '2026-07-01',
                endDate: '2026-09-30',
                salary: '7.500.000 VNĐ / tháng',
                status: 'Đang thực tập',
                companyEvaluationScore: 8.5,
                advisorScore: null,
                finalGrade: null,
                isEmployedAfterInternship: false,
                feedback: 'Đang triển khai phân tích lỗ hổng phần mềm.'
            }
        ]);

        // 10. Tạo Quản lý Đồ án / Luận văn tốt nghiệp (Thesis)
        await Thesis.create([
            {
                topicCode: 'DA_2026_001',
                topicTitle: 'Nghiên cứu và Xây dựng Hệ thống Quản lý Sinh viên Toàn diện tích hợp Chống gian lận học vụ',
                description: 'Xây dựng giải pháp Back-end Node.js, Express, MongoDB với các thuật toán kiểm tra xung đột lịch thi và chống đạo văn Jaccard Index.',
                student: student1._id,
                advisor: teacher1._id,
                reviewer: teacher2._id,
                committee: [teacher1._id, teacher2._id, admin._id],
                academicYear: '2026-2027',
                status: 'Đủ điều kiện bảo vệ',
                milestones: [
                    { name: '1. Nộp đề cương chi tiết', deadline: '2026-06-15', status: 'Đã duyệt', score: 9.5, comment: 'Mục tiêu nghiên cứu rõ ràng' },
                    { name: '2. Báo cáo tiến độ giữa kỳ', deadline: '2026-07-30', status: 'Đã duyệt', score: 9.0, comment: 'Đã hoàn tất toàn bộ API Backend' },
                    { name: '3. Nộp bản thảo báo cáo cuối', deadline: '2026-08-20', status: 'Đã duyệt', score: 9.5, comment: 'Kiểm tra đạo văn 8.5% (Đạt tiêu chuẩn)' },
                    { name: '4. Bảo vệ trước hội đồng', deadline: '2026-09-05', status: 'Chưa nộp', score: null, comment: 'Chuẩn bị slide và demo' }
                ],
                similarityPercentage: 8.5,
                advisorScore: 9.5,
                reviewerScore: 9.0,
                committeeScore: null,
                finalScore: null,
                defenseDate: '2026-09-05',
                defenseRoom: 'Hội trường A - Tòa nhà Công nghệ'
            },
            {
                topicCode: 'DA_2026_002',
                topicTitle: 'Ứng dụng Học máy và Xử lý ngôn ngữ tự nhiên trong phát hiện văn bản gian lận',
                description: 'Thuật toán Cosine Similarity, N-Grams và TF-IDF để kiểm tra tính toàn vẹn của đồ án học thuật.',
                student: student3._id,
                advisor: teacher2._id,
                reviewer: teacher1._id,
                committee: [teacher1._id, teacher2._id],
                academicYear: '2026-2027',
                status: 'Đang thực hiện',
                milestones: [
                    { name: '1. Nộp đề cương chi tiết', deadline: '2026-06-15', status: 'Đã duyệt', score: 8.5, comment: 'Đề cương tốt' },
                    { name: '2. Báo cáo tiến độ giữa kỳ', deadline: '2026-07-30', status: 'Đã duyệt', score: 8.0, comment: 'Đang huấn luyện mô hình' },
                    { name: '3. Nộp bản thảo báo cáo cuối', deadline: '2026-08-20', status: 'Yêu cầu sửa', score: 6.0, comment: 'Cần giảm tỷ lệ trùng lặp' },
                    { name: '4. Bảo vệ trước hội đồng', deadline: '2026-09-05', status: 'Chưa nộp', score: null, comment: '' }
                ],
                similarityPercentage: 24.0,
                advisorScore: 8.0,
                reviewerScore: null,
                committeeScore: null,
                finalScore: null,
                defenseDate: '2026-09-05',
                defenseRoom: 'Phòng Hội đồng 301'
            }
        ]);

        // 11. Tạo Thông báo học vụ (Announcements)
        await Announcement.create([
            {
                title: 'Thông báo về việc Khảo sát ý kiến sinh viên đánh giá công tác giảng dạy HK1',
                category: 'Học vụ',
                content: 'Nhà trường mở cổng khảo sát đánh giá giảng dạy từ ngày 15/08 đến 15/09. Sinh viên thực hiện đánh giá ẩn danh để hoàn tất thủ tục đăng ký môn học kỳ tiếp theo.',
                isPinned: true,
                date: '2026-08-15'
            },
            {
                title: 'Lịch thi kết thúc học phần và quy định phòng thi HK1',
                category: 'Khảo thí & Lịch thi',
                content: 'Lịch thi chính thức đã được cập nhật trên cổng thông tin sinh viên. Sinh viên có mặt trước giờ thi 15 phút và mang theo thẻ sinh viên.',
                isPinned: true,
                date: '2026-08-20'
            },
            {
                title: 'Ngày hội tuyển dụng Thực tập & Việc làm Doanh nghiệp Công nghệ 2026',
                category: 'Thực tập & Việc làm',
                content: 'Hơn 30 doanh nghiệp đối tác như FPT, VNG, Viettel, VNPT tuyển dụng hơn 200 vị trí thực tập sinh và kỹ sư phần mềm.',
                isPinned: false,
                date: '2026-08-25'
            }
        ]);

        console.log('=== NẠP DỮ LIỆU SEED DATA HOÀN TẤT THÀNH CÔNG! ===');
        process.exit(0);
    } catch (err) {
        console.error('Lỗi khi nạp seed data:', err);
        process.exit(1);
    }
};

seedDB();
