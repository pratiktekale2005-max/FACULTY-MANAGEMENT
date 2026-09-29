const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");
const Workshop = require("../models/Workshop");
const User = require("../models/User");

async function restoreWorkshops() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        // Fetch users to get their exact IDs and departments
        const users = await User.find({});
        console.log(`Found ${users.length} users in DB`);

        const findUser = (emailOrName) => {
            return users.find(u => 
                (u.email && u.email.toLowerCase().includes(emailOrName.toLowerCase())) ||
                (u.name && u.name.toLowerCase().includes(emailOrName.toLowerCase()))
            );
        };

        const orgId = new mongoose.Types.ObjectId("6a7df01c3d1dfb4bb99e05e1");

        // Mayuri fegade
        const userMayuri = findUser("kalynmirchimasale@gmail.com") || findUser("Mayuri");
        // Adsul Mam
        const userAdsul = findUser("laxmantekale260@gmail.com") || findUser("Adsul");
        // Ashwini Shirke
        const userAshwini = findUser("samiksharavankole@gmail.com") || findUser("Ashwini");
        // Sagar Dhanke
        const userSagar = findUser("sagar@gmail.com") || findUser("Sagar");
        // Swami Panjala
        const userSwami = findUser("swami@gmail.com") || findUser("Swami");
        // Laxman sir
        const userLaxman = findUser("laxman@gmail.com") || findUser("Laxman");
        // Sanket Jembagi
        const userSanket = findUser("sanket@gmail.com") || findUser("Sanket");
        // Aashotoush Chandgule
        const userAashu = findUser("ashu@gmail.com") || findUser("Aashotoush");
        // Kiran Mali
        const userKiran = findUser("kiran@gmail.com") || findUser("Kiran");
        // Snehal Gholap
        const userSnehal = findUser("snehal@gmail.com") || findUser("Snehal");
        // Farendrakumar Ghodichor
        const userFarendra = findUser("samikshacisco@gmail.com") || findUser("Farendrakumar");

        const sampleWorkshops = [
            // 1. Matched to Approval 6a92acbf94890ae9e44cf0ce
            {
                _id: new mongoose.Types.ObjectId("6a92acbf94890ae9e44cf0cd"),
                organizationId: orgId,
                title: "Google Summer of Code & Open Source Engineering",
                description: "Hands-on masterclass preparing undergraduate students and faculty for Google Summer of Code, Linux Foundation mentorships, and open source repository contributions.",
                date: "2026-08-29",
                time: "10:00 AM - 01:00 PM",
                venue: "Sir M. Visvesvaraya Seminar Hall, DYPCOEI",
                eventType: "organized",
                speakerName: "Dr. Arvind Subramaniam",
                speakerBio: "Lead Open Source Program Strategist at Google India and Fellow of the Linux Foundation.",
                speakerOrganization: "Google India Pvt Ltd",
                speakerContact: "+91 98230 45110",
                guestEmail: "arvind.subramaniam@google.com",
                guestDesignation: "Staff Software Engineer / GSoC Mentor",
                guestOrganization: "Google India",
                workshopType: "Workshop",
                submittedBy: userMayuri?._id || new mongoose.Types.ObjectId("6a7f179aaa300e3bdeb69a6b"),
                department: userMayuri?.department || "Artificial Intelligence & Data Science",
                invitationSentAt: new Date("2026-08-20T10:00:00Z"),
                thankingSentAt: new Date("2026-08-29T15:00:00Z"),
                officialLetterSentAt: new Date("2026-08-20T11:00:00Z"),
                feedbacks: [
                    { name: "Rahul Deshmukh", rating: 5, comments: "Exceptional depth in Git workflows and open-source contribution roadmaps.", category: "Overall" },
                    { name: "Sneha Patil", rating: 5, comments: "Inspiring interactive session with live PR submission demos.", category: "Overall" }
                ],
                postAssessments: [
                    { participantName: "Rahul Deshmukh", score: 9, maxScore: 10, feedback: "Demonstrated clear understanding of git branch rebase.", criteria: "Hands-on Code" },
                    { participantName: "Sneha Patil", score: 10, maxScore: 10, feedback: "Flawless open source repo creation.", criteria: "Hands-on Code" }
                ],
                studentAttendance: ["SE-AIDS-01", "SE-AIDS-02", "TE-AIDS-14", "BE-AIDS-22"],
                photos: [],
                videos: [],
                remuneration: {
                    guestName: "Dr. Arvind Subramaniam",
                    accountHolderName: "Arvind Subramaniam",
                    bankName: "HDFC Bank Ltd",
                    accountNumber: "50100452391024",
                    ifscCode: "HDFC0001234",
                    branchName: "Koregaon Park Pune",
                    panNumber: "ABCPS1234F",
                    totalAmount: 5000,
                    status: "Processed"
                }
            },
            // 2. Matched to Approval 6a9675a4df8170e0ecfca416
            {
                _id: new mongoose.Types.ObjectId("6a9675a4df8170e0ecfca415"),
                organizationId: orgId,
                title: "Agentic AI & Neural Systems Architecture",
                description: "State-of-the-art technical session exploring multi-agent orchestration, LangGraph topologies, tool augmentation, and high-performance neural compute pipelines.",
                date: "2026-09-01",
                time: "10:30 AM - 01:30 PM",
                venue: "Computer Engineering Seminar Auditorium",
                eventType: "organized",
                speakerName: "Dr. Ramesh Joshi",
                speakerBio: "Principal AI Scientist at Tata Consultancy Services (TCS) Innovation Labs.",
                speakerOrganization: "Tata Consultancy Services (TCS)",
                speakerContact: "+91 97654 32109",
                guestEmail: "ramesh.joshi@tcs.com",
                guestDesignation: "Chief AI Architect",
                guestOrganization: "TCS Research Labs",
                workshopType: "Workshop",
                submittedBy: userAdsul?._id || new mongoose.Types.ObjectId("6a90425c71206d38ae6325ec"),
                department: userAdsul?.department || "Cs",
                invitationSentAt: new Date("2026-08-25T09:30:00Z"),
                thankingSentAt: new Date("2026-09-01T16:00:00Z"),
                officialLetterSentAt: new Date("2026-08-25T10:00:00Z"),
                feedbacks: [
                    { name: "Pooja Kulkarni", rating: 5, comments: "Brilliant explanation of agent loops and memory retrieval.", category: "Overall" }
                ],
                postAssessments: [
                    { participantName: "Pooja Kulkarni", score: 10, maxScore: 10, feedback: "Understood agentic self-reflection.", criteria: "Theory & Architecture" }
                ],
                studentAttendance: ["TE-CS-05", "TE-CS-12", "BE-CS-01", "BE-CS-09"],
                photos: [],
                videos: [],
                remuneration: {
                    guestName: "Dr. Ramesh Joshi",
                    accountHolderName: "Ramesh Joshi",
                    bankName: "State Bank of India",
                    accountNumber: "30291823901",
                    ifscCode: "SBIN0004512",
                    branchName: "Shivajinagar Pune",
                    panNumber: "AJMPJ9876K",
                    totalAmount: 6000,
                    status: "Processed"
                }
            },
            // 3. Matched to Approval 6ab7776b85b81f2e095193ca
            {
                _id: new mongoose.Types.ObjectId("6ab7776b85b81f2e095193c9"),
                organizationId: orgId,
                title: "Deep Learning Foundations & Generative Models",
                description: "Comprehensive workshop covering backpropagation mathematics, Transformer attention mechanisms, diffusion models, and fine-tuning on domain-specific datasets.",
                date: "2026-09-05",
                time: "11:00 AM - 02:00 PM",
                venue: "Campus Incubation & Innovation Lab",
                eventType: "organized",
                speakerName: "Prof. Rajesh Kumar",
                speakerBio: "Adjunct Professor at IIT Bombay and Senior Advisor to NVIDIA AI Academic Partnerships.",
                speakerOrganization: "Indian Institute of Technology (IIT) Bombay",
                speakerContact: "+91 99220 11445",
                guestEmail: "rajesh.kumar@iitb.ac.in",
                guestDesignation: "Professor & Head of Machine Learning Center",
                guestOrganization: "IIT Bombay",
                workshopType: "Workshop",
                submittedBy: userAshwini?._id || new mongoose.Types.ObjectId("6a7f1446aa300e3bdeb69534"),
                department: userAshwini?.department || "Artificial Intelligence & Data Science",
                invitationSentAt: new Date("2026-08-28T10:00:00Z"),
                thankingSentAt: new Date("2026-09-05T15:30:00Z"),
                officialLetterSentAt: new Date("2026-08-28T11:00:00Z"),
                feedbacks: [
                    { name: "Aniket Joshi", rating: 5, comments: "Very clear intuition on attention maps and latent space sampling.", category: "Overall" }
                ],
                postAssessments: [
                    { participantName: "Aniket Joshi", score: 9, maxScore: 10, feedback: "Excellent performance in coding assignment.", criteria: "Model Training" }
                ],
                studentAttendance: ["TE-AIDS-01", "TE-AIDS-02", "BE-AIDS-04"],
                photos: [],
                videos: [],
                remuneration: {
                    guestName: "Prof. Rajesh Kumar",
                    accountHolderName: "Rajesh Kumar",
                    bankName: "ICICI Bank",
                    accountNumber: "001201592301",
                    ifscCode: "ICIC0000012",
                    branchName: "Powai Mumbai",
                    panNumber: "BFPPR4321A",
                    totalAmount: 5000,
                    status: "Processed"
                }
            },
            // 4. Sagar Dhanke (CSE)
            {
                _id: new mongoose.Types.ObjectId("6ab76e9ccc7617bd0dd50501"),
                organizationId: orgId,
                title: "Cloud Native Microservices with Docker & Kubernetes",
                description: "Practical engineering session on container orchestration, service meshes, helm charts, CI/CD pipelines, and zero-downtime cluster deployments.",
                date: "2026-09-10",
                time: "10:00 AM - 01:00 PM",
                venue: "Computer Science Cloud Computing Lab",
                eventType: "organized",
                speakerName: "Mr. Sandeep Patil",
                speakerBio: "Principal Architect at Red Hat Enterprise Linux & OpenShift.",
                speakerOrganization: "Red Hat India Pvt Ltd",
                speakerContact: "+91 98811 22334",
                guestEmail: "sandeep.patil@redhat.com",
                guestDesignation: "Principal Cloud Architect",
                guestOrganization: "Red Hat India",
                workshopType: "Workshop",
                submittedBy: userSagar?._id || new mongoose.Types.ObjectId("6ab76e9ccc7617bd0dd505f4"),
                department: userSagar?.department || "Computer Science & Engineering",
                invitationSentAt: new Date("2026-09-02T10:00:00Z"),
                thankingSentAt: new Date("2026-09-10T16:00:00Z"),
                officialLetterSentAt: new Date("2026-09-02T11:00:00Z"),
                feedbacks: [{ name: "Kunal Shinde", rating: 5, comments: "Hands-on cluster demo was fantastic!", category: "Overall" }],
                postAssessments: [{ participantName: "Kunal Shinde", score: 9, maxScore: 10, feedback: "Configured Ingress controller seamlessly.", criteria: "K8s Deployment" }],
                studentAttendance: ["TE-CS-20", "TE-CS-21"],
                photos: [],
                videos: []
            },
            // 5. Swami Panjala (CSE)
            {
                _id: new mongoose.Types.ObjectId("6ab76ececc7617bd0dd50502"),
                organizationId: orgId,
                title: "Network Security & Ethical Hacking Protocols",
                description: "Hands-on penetration testing, Wireshark packet capture analysis, threat modeling, and defensive endpoint hardening.",
                date: "2026-09-12",
                time: "11:00 AM - 02:00 PM",
                venue: "Information Security Lab",
                eventType: "organized",
                speakerName: "Mr. Vikramaditya Shinde",
                speakerBio: "Lead Security Researcher & Certified Ethical Hacker at Quick Heal Technologies.",
                speakerOrganization: "Quick Heal Technologies",
                speakerContact: "+91 97650 99887",
                guestEmail: "vikram.shinde@quickheal.com",
                guestDesignation: "Senior Threat Researcher",
                guestOrganization: "Quick Heal",
                workshopType: "Workshop",
                submittedBy: userSwami?._id || new mongoose.Types.ObjectId("6ab76ececc7617bd0dd505f6"),
                department: userSwami?.department || "Computer Science & Engineering",
                invitationSentAt: new Date("2026-09-04T10:00:00Z"),
                thankingSentAt: new Date("2026-09-12T15:30:00Z"),
                officialLetterSentAt: new Date("2026-09-04T11:00:00Z"),
                feedbacks: [{ name: "Omkar Kulkarni", rating: 5, comments: "Real-time attack simulation was eye opening.", category: "Overall" }],
                postAssessments: [{ participantName: "Omkar Kulkarni", score: 10, maxScore: 10, feedback: "Identified zero-day vulnerabilities in lab VM.", criteria: "Pentesting" }],
                studentAttendance: ["BE-CS-15", "BE-CS-18"],
                photos: [],
                videos: []
            },
            // 6. Sanket Jembagi (AIML - HOD)
            {
                _id: new mongoose.Types.ObjectId("6ab76f60cc7617bd0dd50503"),
                organizationId: orgId,
                title: "Autonomous Robotics & Computer Vision Applications",
                description: "State-of-the-art lecture on SLAM navigation algorithms, LiDAR sensor fusion, and real-time obstacle avoidance in unmanned systems.",
                date: "2026-09-15",
                time: "10:00 AM - 01:00 PM",
                venue: "Robotics & Embedded Systems Lab",
                eventType: "organized",
                speakerName: "Dr. Meenakshi Sundaram",
                speakerBio: "Scientist 'F' at Defence Research and Development Organisation (DRDO).",
                speakerOrganization: "DRDO Pune Labs",
                speakerContact: "+91 94220 87654",
                guestEmail: "meenakshi.sundaram@drdo.gov.in",
                guestDesignation: "Scientist & Project Director",
                guestOrganization: "DRDO",
                workshopType: "Seminar",
                submittedBy: userSanket?._id || new mongoose.Types.ObjectId("6ab76f60cc7617bd0dd505fa"),
                department: userSanket?.department || "Artificial Intelligence & Machine Learning",
                invitationSentAt: new Date("2026-09-08T10:00:00Z"),
                thankingSentAt: new Date("2026-09-15T15:00:00Z"),
                officialLetterSentAt: new Date("2026-09-08T11:00:00Z"),
                feedbacks: [{ name: "Vaibhav Mane", rating: 5, comments: "Inspiring talk on military robotics applications.", category: "Overall" }],
                postAssessments: [{ participantName: "Vaibhav Mane", score: 9, maxScore: 10, feedback: "Understood sensor calibration mathematics.", criteria: "Robotics" }],
                studentAttendance: ["TE-AIML-01", "TE-AIML-02", "BE-AIML-05"],
                photos: [],
                videos: []
            },
            // 7. Aashotoush Chandgule (AIML)
            {
                _id: new mongoose.Types.ObjectId("6ab76fffcc7617bd0dd50504"),
                organizationId: orgId,
                title: "Natural Language Processing with Modern Transformers",
                description: "Detailed workshop on tokenization algorithms, attention mechanisms, fine-tuning BERT and RoBERTa for classification and sentiment analysis.",
                date: "2026-09-18",
                time: "10:30 AM - 01:30 PM",
                venue: "Data Engineering Lab",
                eventType: "organized",
                speakerName: "Dr. Ananya Sen",
                speakerBio: "Principal Data Scientist at Persistent Systems.",
                speakerOrganization: "Persistent Systems Ltd",
                speakerContact: "+91 98223 54321",
                guestEmail: "ananya.sen@persistent.com",
                guestDesignation: "Principal NLP Scientist",
                guestOrganization: "Persistent Systems",
                workshopType: "Workshop",
                submittedBy: userAashu?._id || new mongoose.Types.ObjectId("6ab76fffcc7617bd0dd50861"),
                department: userAashu?.department || "Artificial Intelligence & Machine Learning",
                invitationSentAt: new Date("2026-09-10T10:00:00Z"),
                thankingSentAt: new Date("2026-09-18T16:00:00Z"),
                officialLetterSentAt: new Date("2026-09-10T11:00:00Z"),
                feedbacks: [{ name: "Priya Nair", rating: 5, comments: "Superb hands-on session with HuggingFace pipeline.", category: "Overall" }],
                postAssessments: [{ participantName: "Priya Nair", score: 10, maxScore: 10, feedback: "Fine-tuned BERT model flawlessly.", criteria: "NLP Model Training" }],
                studentAttendance: ["TE-AIML-10", "TE-AIML-11"],
                photos: [],
                videos: []
            },
            // 8. Farendrakumar Ghodichor (AIDS)
            {
                _id: new mongoose.Types.ObjectId("6ab76e32cc7617bd0dd50505"),
                organizationId: orgId,
                title: "Big Data Processing with Apache Spark & Distributed Storage",
                description: "Architectural overview of distributed resilient datasets (RDDs), Spark DataFrames, partitioning strategies, and real-time streaming ETL pipelines.",
                date: "2026-09-22",
                time: "10:00 AM - 01:00 PM",
                venue: "Big Data & Distributed Computing Lab",
                eventType: "organized",
                speakerName: "Mr. Dhananjay Rao",
                speakerBio: "Lead Data Architect at Cognizant Technology Solutions.",
                speakerOrganization: "Cognizant Technology Solutions",
                speakerContact: "+91 98810 55443",
                guestEmail: "dhananjay.rao@cognizant.com",
                guestDesignation: "Enterprise Data Architect",
                guestOrganization: "Cognizant",
                workshopType: "Workshop",
                submittedBy: userFarendra?._id || new mongoose.Types.ObjectId("6ab76e32cc7617bd0dd505f2"),
                department: userFarendra?.department || "Artificial Intelligence & Data Science",
                invitationSentAt: new Date("2026-09-14T10:00:00Z"),
                thankingSentAt: new Date("2026-09-22T15:30:00Z"),
                officialLetterSentAt: new Date("2026-09-14T11:00:00Z"),
                feedbacks: [{ name: "Tanmay Borde", rating: 5, comments: "Very practical explanation of Spark shuffle bottlenecks.", category: "Overall" }],
                postAssessments: [{ participantName: "Tanmay Borde", score: 9, maxScore: 10, feedback: "Optimized multi-node Spark query.", criteria: "Big Data Processing" }],
                studentAttendance: ["TE-AIDS-18", "BE-AIDS-09"],
                photos: [],
                videos: []
            }
        ];

        console.log(`Inserting ${sampleWorkshops.length} workshops...`);
        for (const w of sampleWorkshops) {
            await Workshop.create(w);
            console.log(`Created workshop: "${w.title}" for submittedBy: ${w.submittedBy}`);
        }

        const totalNow = await Workshop.countDocuments({});
        console.log(`Total workshops in DB now: ${totalNow}`);

        await mongoose.disconnect();
        console.log("Workshops restored successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Error restoring workshops:", err);
        process.exit(1);
    }
}

restoreWorkshops();
