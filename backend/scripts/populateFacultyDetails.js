const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const User = require('../models/User');
const Department = require('../models/Department');
const Subject = require('../models/Subject');
const Organization = require('../models/Organization');

async function populateDetails() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB Atlas ✅");

        const targetOrgId = new mongoose.Types.ObjectId('6a7df01c3d1dfb4bb99e05e1');

        // Fetch departments
        const depts = await Department.find({ organizationId: targetOrgId });
        const csDept = depts.find(d => d.code === 'CS');
        const aidsDept = depts.find(d => d.code === 'AIDS');
        const aimlDept = depts.find(d => d.code === 'AIML');
        const admDept = depts.find(d => d.code === 'ADM');

        const facultyUpdates = [
            // ================= COMPUTER SCIENCE & ENGINEERING =================
            {
                email: 'sagar@gmail.com',
                name: 'Sagar Dhanke',
                role: 'Faculty',
                department: 'Computer Science & Engineering',
                departmentId: csDept?._id,
                designation: 'Assistant Professor',
                phone: '+91 98231 45672',
                employeeId: 'EMP-CSE-101',
                joiningDate: '2023-07-15',
                qualification: 'M.Tech in Computer Science & Engineering, Ph.D. (Pursuing)',
                experience: '8+ years of academic and laboratory instruction experience in Data Structures, Advanced Algorithms, and Linux Operating Systems.',
                skills: 'C++, Java, Python, Data Structures & Algorithms, Linux Kernel Architecture, Cloud Computing',
                researchInterests: 'Distributed Systems, Cloud Resource Scheduling, Kernel Optimization',
                achievements: 'Published 4 papers in Scopus-indexed journals, Best Faculty Mentor Award (2025).',
                performanceScore: 88,
                subjectsHandled: ['Data Structures & Algorithms', 'Operating Systems', 'Cloud Computing Architecture']
            },
            {
                email: 'swami@gmail.com',
                name: 'Swami Panjala',
                role: 'Faculty',
                department: 'Computer Science & Engineering',
                departmentId: csDept?._id,
                designation: 'Assistant Professor',
                phone: '+91 98224 56781',
                employeeId: 'EMP-CSE-102',
                joiningDate: '2023-08-01',
                qualification: 'M.Tech in Computer Engineering (Network & Security)',
                experience: '6+ years of university teaching experience focusing on Cyber Security, Network Protocols, and Cryptography.',
                skills: 'Computer Networks, Cryptography, Network Security, Python, Penetration Testing, Cisco Packet Tracer',
                researchInterests: 'Cyber Threat Intelligence, IoT Device Security, Cryptographic Protocols',
                achievements: 'Cisco Certified Network Associate (CCNA), Co-author of 3 IEEE international conference papers.',
                performanceScore: 84,
                subjectsHandled: ['Computer Networks', 'Cyber Security & Forensics', 'Network Programming']
            },
            {
                email: 'laxman@gmail.com',
                name: 'Laxman sir',
                role: 'Faculty',
                department: 'Computer Science & Engineering',
                departmentId: csDept?._id,
                designation: 'Associate Professor',
                phone: '+91 94220 89123',
                employeeId: 'EMP-CSE-103',
                joiningDate: '2019-06-10',
                qualification: 'Ph.D., M.E. in Computer Science & Engineering',
                experience: '16+ years of distinguished academic leadership, curriculum development, and industry-sponsored software engineering mentorship.',
                skills: 'Software Engineering, Object-Oriented System Design, Database Systems, Agile Methodologies, Enterprise Java',
                researchInterests: 'Software Reliability, Automated Code Inspection, Large-Scale Enterprise Architectures',
                achievements: 'Guided 20+ Master\'s theses, 12 Scopus/IEEE publications, IEEE Senior Member.',
                performanceScore: 92,
                subjectsHandled: ['Software Engineering & Testing', 'Object Oriented System Design', 'Enterprise Application Development']
            },
            {
                email: 'laxmantekale260@gmail.com',
                name: 'Adsul Mam',
                role: 'HOD',
                department: 'Computer Science & Engineering',
                departmentId: csDept?._id,
                designation: 'Head of the Department & Associate Professor',
                phone: '7709193548',
                employeeId: 'HOD-CSE-01',
                joiningDate: '2020-01-10',
                qualification: 'Ph.D. in Computer Science & Engineering',
                experience: '14+ years of academic, administrative, and research leadership in Computer Science and Database Engineering.',
                skills: 'Database Management Systems, Distributed Databases, SQL/NoSQL, Data Warehousing, Academic Administration',
                researchInterests: 'Distributed Database Systems, Query Optimization, Big Data Storage Engines',
                achievements: 'HOD of Computer Science & Engineering, Lead NAAC Criteria Coordinator, Published 15+ research papers.',
                performanceScore: 94,
                subjectsHandled: ['Database Management Systems', 'Advanced Database Technologies', 'Distributed Systems']
            },

            // ================= ARTIFICIAL INTELLIGENCE & MACHINE LEARNING =================
            {
                email: 'sanket@gmail.com',
                name: 'Sanket Jembagi',
                role: 'HOD',
                department: 'Artificial Intelligence & Machine Learning',
                departmentId: aimlDept?._id,
                designation: 'Head of the Department & Associate Professor',
                phone: '+91 98501 23456',
                employeeId: 'HOD-AIML-01',
                joiningDate: '2021-03-01',
                qualification: 'Ph.D. in Artificial Intelligence & Machine Learning',
                experience: '12+ years directing AI research laboratories, designing accredited AIML syllabi, and mentoring graduate research scholars.',
                skills: 'Deep Learning, Natural Language Processing, PyTorch, TensorFlow, Computer Vision, Generative AI',
                researchInterests: 'Foundation Models, Medical Image Diagnostics, Reinforcement Learning, Generative AI',
                achievements: 'Head of AIML Department, Principal Investigator for ₹15 Lakhs AI Research Grant, 16 International Journal publications.',
                performanceScore: 95,
                subjectsHandled: ['Deep Learning Architectures', 'Artificial Intelligence Fundamentals', 'Natural Language Processing']
            },
            {
                email: 'ashu@gmail.com',
                name: 'Aashotoush Chandgule',
                role: 'Faculty',
                department: 'Artificial Intelligence & Machine Learning',
                departmentId: aimlDept?._id,
                designation: 'Assistant Professor',
                phone: '+91 97654 32190',
                employeeId: 'EMP-AIML-101',
                joiningDate: '2023-08-16',
                qualification: 'M.Tech in Data Science & Machine Learning',
                experience: '5+ years specializing in Predictive Analytics, Statistical Machine Learning, and Big Data Engineering.',
                skills: 'Python, Scikit-learn, Apache Spark, Pandas, SQL, Data Visualization, MLops',
                researchInterests: 'Predictive Analytics, Graph Neural Networks, Recommender Systems',
                achievements: 'Faculty Advisor for Smart India Hackathon finalists, 3 Scopus indexed conference papers.',
                performanceScore: 86,
                subjectsHandled: ['Machine Learning', 'Big Data Analytics', 'Python for AI & Data Science']
            },
            {
                email: 'kiran@gmail.com',
                name: 'Kiran Mali',
                role: 'Faculty',
                department: 'Artificial Intelligence & Machine Learning',
                departmentId: aimlDept?._id,
                designation: 'Assistant Professor',
                phone: '+91 98901 67890',
                employeeId: 'EMP-AIML-102',
                joiningDate: '2023-09-01',
                qualification: 'M.Tech in Computer Engineering (AI & Robotics)',
                experience: '4+ years in teaching Computer Vision, Neural Network Systems, and Embedded Robotics AI.',
                skills: 'OpenCV, Computer Vision, YOLO, ROS (Robot Operating System), Python, C++, Edge AI',
                researchInterests: 'Autonomous Robotics, Drone Vision Perception, Real-time Edge Video Analytics',
                achievements: 'Robotics Club Faculty Coordinator, 2 IEEE Conference best paper nominations.',
                performanceScore: 83,
                subjectsHandled: ['Computer Vision & Pattern Recognition', 'Neural Networks & Deep Learning', 'Robotics & Edge AI']
            },
            {
                email: 'snehal@gmail.com',
                name: 'Snehal Gholap',
                role: 'Faculty',
                department: 'Artificial Intelligence & Machine Learning',
                departmentId: aimlDept?._id,
                designation: 'Assistant Professor',
                phone: '+91 98812 34567',
                employeeId: 'EMP-AIML-103',
                joiningDate: '2023-07-20',
                qualification: 'M.Tech in Information Technology',
                experience: '6+ years in Artificial Intelligence Ethics, Data Mining, and Cognitive Computing systems.',
                skills: 'AI Ethics, Cognitive Systems, Data Mining & Warehousing, Fullstack AI Integration, FastAPI',
                researchInterests: 'Explainable AI (XAI), Algorithmic Fairness, Cognitive Computing in Healthcare',
                achievements: 'Coordinator for Women in Engineering (WIE) Chapter, 4 peer-reviewed journal papers.',
                performanceScore: 87,
                subjectsHandled: ['Ethics in AI & Responsible ML', 'Data Mining & Warehousing', 'Cognitive Computing']
            },

            // ================= ARTIFICIAL INTELLIGENCE & DATA SCIENCE =================
            {
                email: 'samikshacisco@gmail.com',
                name: 'Farendrakumar Ghodichor',
                role: 'Faculty',
                department: 'Artificial Intelligence & Data Science',
                departmentId: aidsDept?._id,
                designation: 'Assistant Professor',
                phone: '+91 98220 11223',
                employeeId: 'EMP-AIDS-101',
                joiningDate: '2023-06-15',
                qualification: 'M.Tech in Data Science & Engineering',
                experience: '7+ years in Cloud Data Platforms, Large-Scale ETL Pipelines, and Real-time Analytics.',
                skills: 'Cloud Data Platforms (AWS/GCP), Snowflake, Kafka Streaming, Python, SQL, Docker',
                researchInterests: 'Real-time Streaming Analytics, Cloud Native AI Pipelines, Federated Learning',
                achievements: 'AWS Certified Solutions Architect, Published 5 Scopus papers, Co-authored 1 Australian Patent.',
                performanceScore: 89,
                subjectsHandled: ['Big Data Systems & Cloud Computing', 'Data Warehousing & Mining', 'Data Science Laboratory']
            },
            {
                email: 'pratiktekale1501@gmail.com',
                name: 'Mondal Mam',
                role: 'HOD',
                department: 'Artificial Intelligence & Data Science',
                departmentId: aidsDept?._id,
                designation: 'Head of the Department & Professor',
                phone: '+91 98223 99887',
                employeeId: 'HOD-AIDS-01',
                joiningDate: '2018-08-01',
                qualification: 'Ph.D. in Computer Science & Engineering (Data Science)',
                experience: '16+ years establishing advanced Data Science centers of excellence, managing accreditation, and steering research grants.',
                skills: 'Advanced Statistical Modeling, Data Science Governance, Machine Learning, R, Python, Big Data Architecture',
                researchInterests: 'Big Data Optimization, Predictive Health Analytics, AI in Education',
                achievements: 'HOD of AI & Data Science, Received AICTE MODROBS grant (₹12 Lakhs), 22 International Publications.',
                performanceScore: 96,
                subjectsHandled: ['Foundations of Data Science', 'Advanced Data Analytics', 'Statistical Machine Learning']
            },
            {
                email: 'samiksharavankole@gmail.com',
                name: 'Ashwini Shirke',
                role: 'Faculty',
                department: 'Artificial Intelligence & Data Science',
                departmentId: aidsDept?._id,
                designation: 'Assistant Professor',
                phone: '+91 87674 03677',
                employeeId: 'EMP-AIDS-102',
                joiningDate: '2022-08-14',
                qualification: 'M.Tech in Information Technology',
                experience: '7+ years in Artificial Intelligence, Relational Databases, and Student Project Mentorship.',
                skills: 'Artificial Intelligence, DBMS, Python, SQL, Machine Learning Algorithms',
                researchInterests: 'Knowledge Graphs, Intelligent Educational Tutoring Systems',
                achievements: 'Published 3 research papers, Best Department Project Coordinator (2024).',
                performanceScore: 85,
                subjectsHandled: ['Artificial Intelligence', 'Database Management Systems']
            },
            {
                email: 'kalynmirchimasale@gmail.com',
                name: 'Mayuri fegade',
                role: 'Faculty',
                department: 'Artificial Intelligence & Data Science',
                departmentId: aidsDept?._id,
                designation: 'Assistant Professor',
                phone: '+91 87674 03678',
                employeeId: 'EMP-AIDS-103',
                joiningDate: '2022-08-14',
                qualification: 'M.Tech in Information Technology',
                experience: '6+ years in Database Architectures, Web Technologies, and Data Mining.',
                skills: 'DBMS, Web Development, Fullstack JavaScript, Python, Data Analytics',
                researchInterests: 'Web Mining, Text Retrieval Architectures, Semantic Web',
                achievements: 'Organized 4 workshops on GSoC and Open Source, 2 International Conference publications.',
                performanceScore: 86,
                subjectsHandled: ['Database Management Systems', 'Web Application Development']
            },

            // ================= ADMINISTRATION =================
            {
                email: 'pratiktekale2005@gmail.com',
                name: 'Suresh Mali',
                role: 'Principal',
                department: 'Administration',
                departmentId: admDept?._id,
                designation: 'Principal & Campus Director',
                phone: '+91 98220 00111',
                employeeId: 'PRIN-ADM-01',
                joiningDate: '2015-06-01',
                qualification: 'Ph.D., M.E., B.E. in Engineering, Post-Doc',
                experience: '24+ years in Higher Education Leadership, Institutional Governance, NAAC/NBA Accreditation, and Research Administration.',
                skills: 'Institutional Strategy, Accreditation Frameworks, Academic Governance, Research Funding',
                researchInterests: 'Higher Education Policy, Technology-Enhanced Learning, High Performance Computing',
                achievements: 'Campus Director & Principal, Spearheaded NAAC A+ Accreditation, 35+ Publications, 3 Patents.',
                performanceScore: 98,
                subjectsHandled: ['Engineering Ethics & Leadership', 'Institutional Strategy']
            },
            {
                email: 'kalyanmirchimasale@gmail.com',
                name: 'Nikita Mali',
                role: 'Faculty',
                department: 'Administration',
                departmentId: admDept?._id,
                designation: 'Assistant Professor & Academic Coordinator',
                phone: '+91 98221 44556',
                employeeId: 'EMP-ADM-101',
                joiningDate: '2022-09-01',
                qualification: 'M.Tech in Information Technology',
                experience: '5+ years in Institutional Administration, Academic Coordination, and Student Affairs.',
                skills: 'Academic Operations, Examination Coordination, Office Management, ERP Systems',
                researchInterests: 'Educational Information Systems, Digital Campus Technologies',
                achievements: 'Key contributor to ERP digitisation across college departments.',
                performanceScore: 88,
                subjectsHandled: ['Academic Information Systems']
            },
            {
                email: 'pratiklaxmantekale@gmail.com',
                name: 'pratiklaxmantekale',
                role: 'Principal',
                department: 'Administration',
                departmentId: admDept?._id,
                designation: 'Principal & Systems Administrator',
                phone: '7709193548',
                employeeId: 'PRIN-ADM-02',
                joiningDate: '2022-08-14',
                qualification: 'M.Tech in Computer Science & Engineering',
                experience: '8+ years managing campus IT infrastructure, enterprise software systems, and institutional data portals.',
                skills: 'Fullstack Architecture, Cloud Infrastructure, Systems Administration, Database Optimization',
                researchInterests: 'Cloud Architectures, Security Systems, Automated Campus ERP',
                achievements: 'Architect and Administrator of Faculty Activity Management & ERP System.',
                performanceScore: 97,
                subjectsHandled: ['Cloud Computing Systems']
            }
        ];

        console.log(`Starting to update ${facultyUpdates.length} faculty records...`);

        for (const data of facultyUpdates) {
            const user = await User.findOne({ email: data.email.toLowerCase() });
            if (user) {
                user.name = data.name;
                user.role = data.role;
                user.department = data.department;
                if (data.departmentId) user.departmentId = data.departmentId;
                user.designation = data.designation;
                user.phone = data.phone;
                user.employeeId = data.employeeId;
                user.joiningDate = data.joiningDate;
                user.qualification = data.qualification;
                user.experience = data.experience;
                user.skills = data.skills;
                user.researchInterests = data.researchInterests;
                user.achievements = data.achievements;
                user.performanceScore = data.performanceScore;
                user.subjectsHandled = data.subjectsHandled;
                user.organizationId = targetOrgId;
                user.status = 'ACTIVE';

                await user.save();
                console.log(`✅ Updated ${user.name} (${user.email}) - EmpId: ${user.employeeId}, Dept: ${user.department}`);
            } else {
                console.log(`⚠️ User with email ${data.email} not found, skipping.`);
            }
        }

        // Now populate Subjects for each teaching faculty so Green Book, Division Management, and Student counts work!
        console.log("\nEnsuring Subjects exist for faculties...");
        const subjectTemplates = [
            {
                userEmail: 'sagar@gmail.com',
                subjectName: 'Data Structures & Algorithms',
                subjectCode: 'CS-301',
                department: 'Computer Science & Engineering',
                academicYear: '2026-2027',
                semester: 'Semester V',
                lecturesPlanned: 42,
                lecturesConducted: 38,
                divisions: ['A', 'B']
            },
            {
                userEmail: 'swami@gmail.com',
                subjectName: 'Computer Networks & Security',
                subjectCode: 'CS-302',
                department: 'Computer Science & Engineering',
                academicYear: '2026-2027',
                semester: 'Semester V',
                lecturesPlanned: 40,
                lecturesConducted: 36,
                divisions: ['A', 'B']
            },
            {
                userEmail: 'laxman@gmail.com',
                subjectName: 'Software Engineering & Agile Systems',
                subjectCode: 'CS-401',
                department: 'Computer Science & Engineering',
                academicYear: '2026-2027',
                semester: 'Semester VII',
                lecturesPlanned: 40,
                lecturesConducted: 35,
                divisions: ['A', 'B']
            },
            {
                userEmail: 'sanket@gmail.com',
                subjectName: 'Deep Learning Architectures',
                subjectCode: 'AIML-301',
                department: 'Artificial Intelligence & Machine Learning',
                academicYear: '2026-2027',
                semester: 'Semester V',
                lecturesPlanned: 45,
                lecturesConducted: 40,
                divisions: ['A']
            },
            {
                userEmail: 'ashu@gmail.com',
                subjectName: 'Machine Learning Techniques',
                subjectCode: 'AIML-302',
                department: 'Artificial Intelligence & Machine Learning',
                academicYear: '2026-2027',
                semester: 'Semester V',
                lecturesPlanned: 42,
                lecturesConducted: 37,
                divisions: ['A']
            },
            {
                userEmail: 'kiran@gmail.com',
                subjectName: 'Computer Vision & Pattern Recognition',
                subjectCode: 'AIML-401',
                department: 'Artificial Intelligence & Machine Learning',
                academicYear: '2026-2027',
                semester: 'Semester VII',
                lecturesPlanned: 40,
                lecturesConducted: 34,
                divisions: ['A']
            },
            {
                userEmail: 'snehal@gmail.com',
                subjectName: 'Ethics in AI & Responsible ML',
                subjectCode: 'AIML-402',
                department: 'Artificial Intelligence & Machine Learning',
                academicYear: '2026-2027',
                semester: 'Semester VII',
                lecturesPlanned: 36,
                lecturesConducted: 32,
                divisions: ['A']
            },
            {
                userEmail: 'samikshacisco@gmail.com',
                subjectName: 'Big Data Systems & Cloud Computing',
                subjectCode: 'AIDS-301',
                department: 'Artificial Intelligence & Data Science',
                academicYear: '2026-2027',
                semester: 'Semester V',
                lecturesPlanned: 44,
                lecturesConducted: 39,
                divisions: ['A']
            },
            {
                userEmail: 'pratiktekale1501@gmail.com',
                subjectName: 'Advanced Data Analytics & Governance',
                subjectCode: 'AIDS-401',
                department: 'Artificial Intelligence & Data Science',
                academicYear: '2026-2027',
                semester: 'Semester VII',
                lecturesPlanned: 40,
                lecturesConducted: 37,
                divisions: ['A']
            }
        ];

        for (const st of subjectTemplates) {
            const user = await User.findOne({ email: st.userEmail });
            if (!user) continue;

            const existingSubject = await Subject.findOne({
                organizationId: targetOrgId,
                userId: user._id,
                subjectCode: st.subjectCode
            });

            if (!existingSubject) {
                // Generate demo students for division
                const students = [];
                const divList = st.divisions || ['A'];
                divList.forEach((div, dIdx) => {
                    for (let i = 1; i <= 25; i++) {
                        const roll = `${div}-${String(i).padStart(2, '0')}`;
                        students.push({
                            rollNo: roll,
                            name: `Student ${div} ${i}`,
                            gender: i % 2 === 0 ? 'Female' : 'Male',
                            mobileNumber: `+91 98000 ${String(10000 + i + dIdx * 100).substring(1)}`,
                            prnNumber: `PRN2026${user.department.substring(0, 2).toUpperCase()}${roll}`,
                            division: div,
                            skills: 'Programming, Analytical Problem Solving',
                            internalMarks: { cia: 18 + (i % 3), mse: 25 + (i % 5), ese: 55 + (i % 10), practical: 22 },
                            attendance: [
                                { date: '2026-08-10', status: 'PRESENT' },
                                { date: '2026-08-17', status: 'PRESENT' },
                                { date: '2026-08-24', status: i % 5 === 0 ? 'ABSENT' : 'PRESENT' }
                            ]
                        });
                    }
                });

                const newSubject = new Subject({
                    organizationId: targetOrgId,
                    userId: user._id,
                    subjectName: st.subjectName,
                    subjectCode: st.subjectCode,
                    department: user.department,
                    academicYear: st.academicYear,
                    semester: st.semester,
                    lecturesPlanned: st.lecturesPlanned,
                    lecturesConducted: st.lecturesConducted,
                    hasDivision: divList.length > 1,
                    numberOfDivisions: divList.length,
                    divisionList: divList,
                    students: students,
                    lectures: Array.from({ length: st.lecturesConducted }, (_, i) => ({
                        topic: `Unit ${Math.floor(i / 6) + 1}: Core Principles & Implementation Part ${i + 1}`,
                        plannedDate: `2026-08-${String((i % 25) + 1).padStart(2, '0')}`,
                        conductedDate: `2026-08-${String((i % 25) + 1).padStart(2, '0')}`,
                        conductedTopic: `Completed: Topic ${i + 1}`,
                        status: 'completed',
                        lectureDeliveryStatus: 'COMPLETED'
                    }))
                });

                await newSubject.save();
                console.log(`📚 Created Subject ${st.subjectName} (${st.subjectCode}) for ${user.name} with ${students.length} students`);
            } else {
                console.log(`ℹ️ Subject ${st.subjectCode} already exists for ${user.name}`);
            }
        }

        console.log("\nAll faculty details and subjects populated successfully! 🎉");
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error("Population error:", err);
        process.exit(1);
    }
}

populateDetails();
