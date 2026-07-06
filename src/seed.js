const bcrypt = require('bcryptjs');
const { query, testConnection } = require('./config/database');
const logger = require('./utils/logger');

const seedDatabase = async () => {
  try {
    logger.info('Clearing existing data...');

    await query('SET FOREIGN_KEY_CHECKS = 0');
    await query('TRUNCATE TABLE notifications');
    await query('TRUNCATE TABLE evaluations');
    await query('TRUNCATE TABLE feedback');
    await query('TRUNCATE TABLE documents');
    await query('TRUNCATE TABLE projects');
    await query('TRUNCATE TABLE users');
    await query('SET FOREIGN_KEY_CHECKS = 1');

    logger.info('Existing data cleared');

    logger.info('👥 Creating users...');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const users = [
      {
        id: 1,
        name: 'System Admin',
        email: 'admin@uni.edu',
        password: hashedPassword,
        role: 'admin',
        department: 'IT',
        title: 'Administrator',
        phone: '+2348012345678',
      },
      {
        id: 2,
        name: 'Dr. Sarah Johnson',
        email: 's.johnson@uni.edu',
        password: hashedPassword,
        role: 'supervisor',
        department: 'Computer Science',
        title: 'Senior Lecturer',
        specialization: 'AI/ML',
        phone: '+2348012345679',
      },
      {
        id: 3,
        name: 'Prof. Michael Brown',
        email: 'm.brown@uni.edu',
        password: hashedPassword,
        role: 'supervisor',
        department: 'Software Engineering',
        title: 'Professor',
        specialization: 'Web Development',
        phone: '+2348012345680',
      },
      {
        id: 4,
        name: 'John Smith',
        email: 'john.smith@student.edu',
        password: hashedPassword,
        role: 'student',
        department: 'Computer Science',
        matric_number: 'CS/2021/001',
        level: '400',
        phone: '+2348012345681',
      },
      {
        id: 5,
        name: 'Emily Davis',
        email: 'emily.davis@student.edu',
        password: hashedPassword,
        role: 'student',
        department: 'Computer Science',
        matric_number: 'CS/2021/002',
        level: '400',
        phone: '+2348012345682',
      },
      {
        id: 6,
        name: 'David Wilson',
        email: 'd.wilson@student.edu',
        password: hashedPassword,
        role: 'student',
        department: 'Software Engineering',
        matric_number: 'SE/2021/001',
        level: '400',
        phone: '+2348012345683',
      },
    ];

    for (const user of users) {
      await query(
        `INSERT INTO users (id, name, email, password, role, department, phone, matric_number, title, specialization, level)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.name,
          user.email,
          user.password,
          user.role,
          user.department,
          user.phone,
          user.matric_number || null,
          user.title || null,
          user.specialization || null,
          user.level || null,
        ]
      );
    }
    logger.info('✅ Created 6 users\n');

    logger.info('📁 Creating projects...');

    const projects = [
      {
        id: 1,
        title: 'AI-Based Student Performance Predictor',
        description:
          'A machine learning system that predicts student academic performance based on historical data, attendance, and engagement metrics.',
        student_id: 4,
        supervisor_id: 2,
        department: 'Computer Science',
        status: 'approved',
        progress: 100,
        start_date: '2025-01-15',
        submission_date: '2025-08-01',
        expected_completion_date: '2025-07-30',
        objectives: JSON.stringify([
          'Data collection and preprocessing',
          'Model development',
          'Training and validation',
          'Deployment',
        ]),
        technologies: JSON.stringify(['Python', 'TensorFlow', 'Scikit-learn', 'Flask', 'MySQL']),
      },
      {
        id: 2,
        title: 'E-Commerce Platform for Small Businesses',
        description:
          'A full-stack e-commerce platform designed for small businesses to sell products online with inventory management.',
        student_id: 5,
        supervisor_id: 3,
        department: 'Computer Science',
        status: 'under_review',
        progress: 95,
        start_date: '2025-02-01',
        submission_date: '2025-09-15',
        expected_completion_date: '2025-09-10',
        objectives: JSON.stringify([
          'User authentication',
          'Product catalog',
          'Shopping cart',
          'Payment integration',
          'Admin dashboard',
        ]),
        technologies: JSON.stringify(['React', 'Node.js', 'Express', 'MongoDB', 'Stripe']),
      },
      {
        id: 3,
        title: 'Mobile Health Monitoring App',
        description:
          'A mobile application that tracks health metrics and provides personalized health recommendations.',
        student_id: 6,
        supervisor_id: 2,
        department: 'Software Engineering',
        status: 'in_progress',
        progress: 70,
        start_date: '2025-03-01',
        expected_completion_date: '2025-10-30',
        objectives: JSON.stringify([
          'User health profile',
          'Activity tracking',
          'Health insights',
          'Doctor consultation booking',
        ]),
        technologies: JSON.stringify(['React Native', 'Firebase', 'Python', 'TensorFlow Lite']),
      },
      {
        id: 4,
        title: 'Online Library Management System',
        description:
          'A comprehensive library management system for managing books, members, and borrowing records.',
        student_id: 4,
        supervisor_id: 3,
        department: 'Computer Science',
        status: 'rejected',
        progress: 100,
        start_date: '2024-09-01',
        submission_date: '2025-04-15',
        expected_completion_date: '2025-04-10',
        objectives: JSON.stringify([
          'Book catalog management',
          'Member management',
          'Borrowing system',
          'Fine calculation',
        ]),
        technologies: JSON.stringify(['Java', 'Spring Boot', 'MySQL', 'React']),
      },
      {
        id: 5,
        title: 'Smart Home Automation System',
        description:
          'An IoT-based system for controlling home appliances remotely with voice commands and mobile app.',
        student_id: 5,
        supervisor_id: 2,
        department: 'Computer Science',
        status: 'draft',
        progress: 15,
        start_date: '2025-09-01',
        expected_completion_date: '2026-04-30',
        objectives: JSON.stringify([
          'Device integration',
          'Mobile app development',
          'Voice control',
          'Energy monitoring',
        ]),
        technologies: JSON.stringify(['Python', 'Raspberry Pi', 'Flutter', 'MQTT', 'Node-RED']),
      },
      {
        id: 6,
        title: 'Blockchain Certificate Verification',
        description:
          'A blockchain-based system for issuing and verifying academic certificates to prevent fraud.',
        student_id: 6,
        supervisor_id: 3,
        department: 'Software Engineering',
        status: 'submitted',
        progress: 90,
        start_date: '2025-01-20',
        submission_date: '2025-09-20',
        expected_completion_date: '2025-09-15',
        objectives: JSON.stringify([
          'Smart contract development',
          'Certificate issuance',
          'Verification portal',
          'Admin interface',
        ]),
        technologies: JSON.stringify(['Solidity', 'Ethereum', 'React', 'Web3.js', 'IPFS']),
      },
    ];

    for (const project of projects) {
      await query(
        `INSERT INTO projects (id, title, description, student_id, supervisor_id, department, status, progress, start_date, submission_date, expected_completion_date, objectives, technologies)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          project.id,
          project.title,
          project.description,
          project.student_id,
          project.supervisor_id,
          project.department,
          project.status,
          project.progress,
          project.start_date,
          project.submission_date || null,
          project.expected_completion_date,
          project.objectives,
          project.technologies,
        ]
      );
    }
    logger.info('✅ Created 6 projects\n');

    logger.info('📄 Creating documents...');

    const documents = [
      {
        project_id: 1,
        name: 'Project Proposal',
        type: 'proposal',
        file_path: '/uploads/projects/1/proposal.pdf',
        file_size: '2.5 MB',
        mime_type: 'application/pdf',
      },
      {
        project_id: 1,
        name: 'Chapter 1 - Introduction',
        type: 'chapter',
        file_path: '/uploads/projects/1/chapter1.pdf',
        file_size: '1.8 MB',
        mime_type: 'application/pdf',
      },
      {
        project_id: 1,
        name: 'Chapter 2 - Literature Review',
        type: 'chapter',
        file_path: '/uploads/projects/1/chapter2.pdf',
        file_size: '2.1 MB',
        mime_type: 'application/pdf',
      },
      {
        project_id: 1,
        name: 'Final Report',
        type: 'final',
        file_path: '/uploads/projects/1/final.pdf',
        file_size: '5.2 MB',
        mime_type: 'application/pdf',
      },

      {
        project_id: 2,
        name: 'Project Proposal',
        type: 'proposal',
        file_path: '/uploads/projects/2/proposal.pdf',
        file_size: '2.3 MB',
        mime_type: 'application/pdf',
      },
      {
        project_id: 2,
        name: 'Chapter 1 - Introduction',
        type: 'chapter',
        file_path: '/uploads/projects/2/chapter1.pdf',
        file_size: '1.5 MB',
        mime_type: 'application/pdf',
      },
      {
        project_id: 2,
        name: 'Chapter 2 - System Design',
        type: 'chapter',
        file_path: '/uploads/projects/2/chapter2.pdf',
        file_size: '2.8 MB',
        mime_type: 'application/pdf',
      },
      {
        project_id: 2,
        name: 'Final Report',
        type: 'final',
        file_path: '/uploads/projects/2/final.pdf',
        file_size: '4.9 MB',
        mime_type: 'application/pdf',
      },

      {
        project_id: 3,
        name: 'Project Proposal',
        type: 'proposal',
        file_path: '/uploads/projects/3/proposal.pdf',
        file_size: '1.9 MB',
        mime_type: 'application/pdf',
      },
      {
        project_id: 3,
        name: 'Chapter 1 - Introduction',
        type: 'chapter',
        file_path: '/uploads/projects/3/chapter1.pdf',
        file_size: '1.4 MB',
        mime_type: 'application/pdf',
      },
      {
        project_id: 3,
        name: 'Chapter 2 - Literature Review',
        type: 'chapter',
        file_path: '/uploads/projects/3/chapter2.pdf',
        file_size: '1.7 MB',
        mime_type: 'application/pdf',
      },

      {
        project_id: 4,
        name: 'Project Proposal',
        type: 'proposal',
        file_path: '/uploads/projects/4/proposal.pdf',
        file_size: '2.0 MB',
        mime_type: 'application/pdf',
      },
      {
        project_id: 4,
        name: 'Chapter 1 - Introduction',
        type: 'chapter',
        file_path: '/uploads/projects/4/chapter1.pdf',
        file_size: '1.6 MB',
        mime_type: 'application/pdf',
      },
      {
        project_id: 4,
        name: 'Final Report',
        type: 'final',
        file_path: '/uploads/projects/4/final.pdf',
        file_size: '4.5 MB',
        mime_type: 'application/pdf',
      },

      {
        project_id: 5,
        name: 'Project Proposal',
        type: 'proposal',
        file_path: '/uploads/projects/5/proposal.pdf',
        file_size: '1.2 MB',
        mime_type: 'application/pdf',
      },

      {
        project_id: 6,
        name: 'Project Proposal',
        type: 'proposal',
        file_path: '/uploads/projects/6/proposal.pdf',
        file_size: '2.1 MB',
        mime_type: 'application/pdf',
      },
      {
        project_id: 6,
        name: 'Chapter 1 - Introduction',
        type: 'chapter',
        file_path: '/uploads/projects/6/chapter1.pdf',
        file_size: '1.8 MB',
        mime_type: 'application/pdf',
      },
      {
        project_id: 6,
        name: 'Chapter 2 - Literature Review',
        type: 'chapter',
        file_path: '/uploads/projects/6/chapter2.pdf',
        file_size: '2.0 MB',
        mime_type: 'application/pdf',
      },
      {
        project_id: 6,
        name: 'Chapter 3 - Methodology',
        type: 'chapter',
        file_path: '/uploads/projects/6/chapter3.pdf',
        file_size: '2.3 MB',
        mime_type: 'application/pdf',
      },
      {
        project_id: 6,
        name: 'Final Report',
        type: 'final',
        file_path: '/uploads/projects/6/final.pdf',
        file_size: '5.0 MB',
        mime_type: 'application/pdf',
      },
    ];

    for (const doc of documents) {
      await query(
        `INSERT INTO documents (project_id, name, type, file_path, file_size, mime_type)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [doc.project_id, doc.name, doc.type, doc.file_path, doc.file_size, doc.mime_type]
      );
    }
    logger.info('✅ Created 20 documents\n');

    logger.info('💬 Creating feedback...');

    const feedback = [
      {
        project_id: 1,
        supervisor_id: 2,
        type: 'general',
        subject: 'Initial Proposal Review',
        message:
          'Your proposal looks well-structured. The objectives are clear and the technology stack is appropriate. I recommend adding more detail to the data collection phase.',
        rating: 4,
        status: 'read',
      },
      {
        project_id: 1,
        supervisor_id: 2,
        type: 'chapter',
        subject: 'Chapter 1 Feedback',
        message:
          'Good introduction to the problem domain. Consider expanding the background section to include more recent literature.',
        rating: 5,
        status: 'read',
      },
      {
        project_id: 1,
        supervisor_id: 2,
        type: 'milestone',
        subject: 'Phase 1 Completion',
        message:
          'Excellent work on completing the data collection phase. Your preprocessing pipeline is well-documented.',
        rating: 5,
        status: 'read',
      },

      {
        project_id: 2,
        supervisor_id: 3,
        type: 'chapter',
        subject: 'Chapter 2 System Design',
        message:
          'The system architecture is solid. However, I would like to see more detail on the payment integration section.',
        rating: 4,
        status: 'read',
      },
      {
        project_id: 2,
        supervisor_id: 3,
        type: 'general',
        subject: 'Final Review Before Submission',
        message:
          'Good progress! Please ensure all chapters are properly formatted according to the department guidelines before final submission.',
        rating: 4,
        status: 'unread',
      },

      {
        project_id: 3,
        supervisor_id: 2,
        type: 'general',
        subject: 'Progress Feedback',
        message:
          'Good start on the project. The timeline seems reasonable but you need to accelerate the development pace to meet the deadline.',
        rating: 3,
        status: 'unread',
      },
      {
        project_id: 3,
        supervisor_id: 2,
        type: 'chapter',
        subject: 'Chapter 1 Review',
        message:
          'The introduction is well-written. Consider adding more details about existing health monitoring solutions in the market.',
        rating: 4,
        status: 'unread',
      },
      {
        project_id: 3,
        supervisor_id: 2,
        type: 'milestone',
        subject: 'Prototype Demo',
        message:
          'The prototype demonstrates good understanding of the requirements. Work on improving the user interface for the next iteration.',
        rating: 4,
        status: 'unread',
      },

      {
        project_id: 4,
        supervisor_id: 3,
        type: 'general',
        subject: 'Major Issues Noted',
        message:
          'There are significant concerns with this project. The scope is too narrow and the technical implementation lacks depth. Major revisions are required.',
        rating: 1,
        status: 'read',
      },
      {
        project_id: 4,
        supervisor_id: 3,
        type: 'chapter',
        subject: 'Chapter 1 Feedback',
        message:
          'The introduction lacks proper academic writing structure. More citations are needed.',
        rating: 2,
        status: 'read',
      },
      {
        project_id: 4,
        supervisor_id: 3,
        type: 'milestone',
        subject: 'Final Submission Review',
        message:
          'The project does not meet the minimum requirements for approval. The code quality is poor and documentation is incomplete.',
        rating: 2,
        status: 'read',
      },

      {
        project_id: 5,
        supervisor_id: 2,
        type: 'general',
        subject: 'Proposal Suggestions',
        message:
          'Your proposal topic is interesting. However, I recommend focusing on a specific aspect of smart home automation to make the scope more manageable.',
        rating: 3,
        status: 'unread',
      },
      {
        project_id: 5,
        supervisor_id: 2,
        type: 'milestone',
        subject: 'Topic Refinement',
        message:
          'Please revise your objectives to be more specific and achievable within the given timeframe.',
        rating: 3,
        status: 'unread',
      },

      {
        project_id: 6,
        supervisor_id: 3,
        type: 'chapter',
        subject: 'Chapter 3 Methodology',
        message:
          'The methodology chapter is well-written. The smart contract design is innovative. Good job on the IPFS integration plan.',
        rating: 4,
        status: 'read',
      },
      {
        project_id: 6,
        supervisor_id: 3,
        type: 'general',
        subject: 'Pre-Submission Review',
        message:
          'Excellent progress! Your project is almost ready for final submission. Please do a final proof-read of all chapters.',
        rating: 5,
        status: 'read',
      },
    ];

    for (const fb of feedback) {
      await query(
        `INSERT INTO feedback (project_id, supervisor_id, type, subject, message, rating, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [fb.project_id, fb.supervisor_id, fb.type, fb.subject, fb.message, fb.rating, fb.status]
      );
    }
    logger.info('✅ Created 14 feedback entries\n');

    logger.info('📝 Creating evaluations...');

    const evaluations = [
      {
        project_id: 1,
        evaluator_id: 2,
        evaluator_role: 'supervisor',
        criteria: JSON.stringify([
          { name: 'Problem Definition', score: 18, maxScore: 20 },
          { name: 'Literature Review', score: 17, maxScore: 20 },
          { name: 'System Design', score: 16, maxScore: 20 },
          { name: 'Implementation', score: 17, maxScore: 20 },
          { name: 'Testing & Documentation', score: 17, maxScore: 20 },
        ]),
        total_score: 85,
        max_total_score: 100,
        grade: 'A',
        general_comment:
          'An excellent project that demonstrates strong understanding of machine learning concepts. The implementation is well-documented and the results are impressive. Congratulations on a job well done!',
        status: 'completed',
      },
      {
        project_id: 4,
        evaluator_id: 3,
        evaluator_role: 'supervisor',
        criteria: JSON.stringify([
          { name: 'Problem Definition', score: 5, maxScore: 20 },
          { name: 'Literature Review', score: 6, maxScore: 20 },
          { name: 'System Design', score: 7, maxScore: 20 },
          { name: 'Implementation', score: 8, maxScore: 20 },
          { name: 'Testing & Documentation', score: 6, maxScore: 20 },
        ]),
        total_score: 32,
        max_total_score: 100,
        grade: 'F',
        general_comment:
          'This project does not meet the minimum requirements. The scope is too narrow, the implementation lacks depth, and the documentation is inadequate. The code quality is poor with insufficient testing. A complete revision is required.',
        status: 'completed',
      },
      {
        project_id: 2,
        evaluator_id: 3,
        evaluator_role: 'supervisor',
        criteria: JSON.stringify([
          { name: 'Problem Definition', score: 0, maxScore: 20 },
          { name: 'Literature Review', score: 0, maxScore: 20 },
          { name: 'System Design', score: 0, maxScore: 20 },
          { name: 'Implementation', score: 0, maxScore: 20 },
          { name: 'Testing & Documentation', score: 0, maxScore: 20 },
        ]),
        total_score: 0,
        max_total_score: 100,
        grade: null,
        general_comment: null,
        status: 'pending',
      },
      {
        project_id: 6,
        evaluator_id: 3,
        evaluator_role: 'supervisor',
        criteria: JSON.stringify([
          { name: 'Problem Definition', score: 0, maxScore: 20 },
          { name: 'Literature Review', score: 0, maxScore: 20 },
          { name: 'System Design', score: 0, maxScore: 20 },
          { name: 'Implementation', score: 0, maxScore: 20 },
          { name: 'Testing & Documentation', score: 0, maxScore: 20 },
        ]),
        total_score: 0,
        max_total_score: 100,
        grade: null,
        general_comment: null,
        status: 'pending',
      },
    ];

    for (const projectEvaluation of evaluations) {
      await query(
        `INSERT INTO evaluations (project_id, evaluator_id, evaluator_role, criteria, total_score, max_total_score, grade, general_comment, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectEvaluation.project_id,
          projectEvaluation.evaluator_id,
          projectEvaluation.evaluator_role,
          projectEvaluation.criteria,
          projectEvaluation.total_score,
          projectEvaluation.max_total_score,
          projectEvaluation.grade,
          projectEvaluation.general_comment,
          projectEvaluation.status,
        ]
      );
    }
    logger.info('✅ Created 4 evaluations\n');

    logger.info('🔔 Creating notifications...');

    const notifications = [
      {
        user_id: 4,
        type: 'feedback',
        title: 'New Feedback Received',
        message: 'You have received feedback on "AI-Based Student Performance Predictor"',
        action_url: '/student/projects/1',
        read_status: true,
      },
      {
        user_id: 4,
        type: 'evaluation',
        title: 'Project Evaluated',
        message:
          'Your project "AI-Based Student Performance Predictor" has been evaluated. Grade: A',
        action_url: '/student/projects/1',
        read_status: true,
      },
      {
        user_id: 4,
        type: 'feedback',
        title: 'Project Status Changed',
        message: 'Your project "Online Library Management System" has been rejected',
        action_url: '/student/projects/4',
        read_status: true,
      },
      {
        user_id: 4,
        type: 'submission',
        title: 'Project Submitted',
        message: 'Your project "Online Library Management System" has been submitted for review',
        action_url: '/student/projects/4',
        read_status: true,
      },
      {
        user_id: 4,
        type: 'feedback',
        title: 'New Feedback Received',
        message: 'You have received feedback on "Online Library Management System"',
        action_url: '/student/projects/4',
        read_status: true,
      },

      {
        user_id: 5,
        type: 'feedback',
        title: 'New Feedback Received',
        message: 'You have received feedback on "E-Commerce Platform for Small Businesses"',
        action_url: '/student/projects/2',
        read_status: true,
      },
      {
        user_id: 5,
        type: 'submission',
        title: 'Project Submitted',
        message:
          'Your project "E-Commerce Platform for Small Businesses" has been submitted for review',
        action_url: '/student/projects/2',
        read_status: true,
      },
      {
        user_id: 5,
        type: 'feedback',
        title: 'New Feedback Received',
        message: 'You have received feedback on "Smart Home Automation System"',
        action_url: '/student/projects/5',
        read_status: false,
      },
      {
        user_id: 5,
        type: 'reminder',
        title: 'Draft Project Reminder',
        message: 'You have a draft project "Smart Home Automation System" in progress',
        action_url: '/student/projects/5',
        read_status: false,
      },

      {
        user_id: 6,
        type: 'feedback',
        title: 'New Feedback Received',
        message: 'You have received feedback on "Mobile Health Monitoring App"',
        action_url: '/student/projects/3',
        read_status: false,
      },
      {
        user_id: 6,
        type: 'submission',
        title: 'Project Submitted',
        message: 'Your project "Blockchain Certificate Verification" has been submitted for review',
        action_url: '/student/projects/6',
        read_status: true,
      },
      {
        user_id: 6,
        type: 'feedback',
        title: 'New Feedback Received',
        message: 'You have received feedback on "Blockchain Certificate Verification"',
        action_url: '/student/projects/6',
        read_status: true,
      },

      {
        user_id: 2,
        type: 'submission',
        title: 'New Project Submitted',
        message: 'John Smith has submitted "AI-Based Student Performance Predictor" for review',
        action_url: '/supervisor/projects/1',
        read_status: true,
      },
      {
        user_id: 2,
        type: 'submission',
        title: 'New Project Submitted',
        message: 'David Wilson has submitted "Mobile Health Monitoring App"',
        action_url: '/supervisor/projects/3',
        read_status: false,
      },
      {
        user_id: 2,
        type: 'submission',
        title: 'New Project Submitted',
        message: 'Emily Davis has submitted "Smart Home Automation System"',
        action_url: '/supervisor/projects/5',
        read_status: false,
      },
      {
        user_id: 2,
        type: 'reminder',
        title: 'Pending Review',
        message: 'You have projects awaiting evaluation',
        action_url: '/supervisor/projects',
        read_status: false,
      },

      {
        user_id: 3,
        type: 'submission',
        title: 'New Project Submitted',
        message: 'Emily Davis has submitted "E-Commerce Platform for Small Businesses" for review',
        action_url: '/supervisor/projects/2',
        read_status: true,
      },
      {
        user_id: 3,
        type: 'submission',
        title: 'New Project Submitted',
        message: 'John Smith has submitted "Online Library Management System"',
        action_url: '/supervisor/projects/4',
        read_status: true,
      },
      {
        user_id: 3,
        type: 'submission',
        title: 'New Project Submitted',
        message: 'David Wilson has submitted "Blockchain Certificate Verification"',
        action_url: '/supervisor/projects/6',
        read_status: false,
      },
      {
        user_id: 3,
        type: 'reminder',
        title: 'Pending Review',
        message: 'You have projects awaiting evaluation',
        action_url: '/supervisor/projects',
        read_status: false,
      },
    ];

    for (const notif of notifications) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message, action_url, read_status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [notif.user_id, notif.type, notif.title, notif.message, notif.action_url, notif.read_status]
      );
    }
    logger.info('✅ Created 19 notifications\n');

    logger.info('═══════════════════════════════════════════════════════');
    logger.info('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    logger.info('═══════════════════════════════════════════════════════\n');

    logger.info('📋 SEED DATA SUMMARY:\n');
    logger.info('  👥 Users: 6');
    logger.info('     - 1 Admin: admin@uni.edu');
    logger.info('     - 2 Supervisors: s.johnson@uni.edu, m.brown@uni.edu');
    logger.info(
      '     - 3 Students: john.smith@student.edu, emily.davis@student.edu, d.wilson@student.edu'
    );
    logger.info('');
    logger.info('  📁 Projects: 6');
    logger.info('     - #1: AI-Based Student Performance Predictor (approved, 100%)');
    logger.info('     - #2: E-Commerce Platform (under_review, 95%)');
    logger.info('     - #3: Mobile Health Monitoring App (in_progress, 70%)');
    logger.info('     - #4: Online Library Management System (rejected, 100%)');
    logger.info('     - #5: Smart Home Automation System (draft, 15%)');
    logger.info('     - #6: Blockchain Certificate Verification (submitted, 90%)');
    logger.info('');
    logger.info('  📄 Documents: 20');
    logger.info(
      '  💬 Feedback: 14 (all types: general, chapter, milestone; ratings 1-5; read/unread)'
    );
    logger.info('  📝 Evaluations: 4 (2 completed with grades A and F, 2 pending)');
    logger.info('  🔔 Notifications: 19 (mixed read/unread for all users)');
    logger.info('');
    logger.info('  🔑 Password for all users: password123');
    logger.info('');
    logger.info('═══════════════════════════════════════════════════════\n');
  } catch (error) {
    logger.error('❌ Seeding failed:', error.message);
    throw error;
  }
};

const runSeed = async () => {
  try {
    logger.info('🔌 Testing database connection...');
    const connected = await testConnection();

    if (!connected) {
      logger.error('❌ Database connection failed. Please check your configuration.');
      process.exit(1);
    }

    logger.info('✅ Database connected\n');
    await seedDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Seed error:', error.message);
    process.exit(1);
  }
};

runSeed();
