import "dotenv/config";
import { PrismaClient, Role, Gender, AttendanceStatus, LeaveStatus, LeaveApplicantType, LeaveType, MealType, TCStatus, NoticeAudience } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";
import { validateSeedEnvironment } from "../src/lib/seed-guard";

// ── Environment Guard ───────────────────────────────────────────────────────────
const guard = validateSeedEnvironment(process.env);
if (!guard.allowed) {
  console.error("==================================================================");
  console.error("SEED ABORTED BY SAFETY GUARD:");
  console.error(guard.error);
  console.error("==================================================================");
  process.exit(1);
}

const adminPhone = process.env.DEMO_ADMIN_PHONE!;
const adminPassword = process.env.DEMO_ADMIN_PASSWORD!;
const teacherPhone = process.env.DEMO_TEACHER_PHONE!;
const teacherPassword = process.env.DEMO_TEACHER_PASSWORD!;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting synthetic demo database seed...");

  // 1. Academic Session
  const session = await prisma.academicSession.upsert({
    where: { label: "2026-2027" },
    update: {},
    create: {
      label: "2026-2027",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      isCurrent: true,
    },
  });

  // 2. School Settings (Synthetic Data Only)
  await prisma.schoolSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      schoolName: "Demo Composite School",
      udiseCode: "09000000000",
      schoolBlock: "Demo Block",
      schoolDistrict: "Demo District",
      defaultLocale: "hi",
    },
  });

  // 3. Admin User
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  const adminUser = await prisma.user.upsert({
    where: { phone: adminPhone },
    update: { passwordHash: adminPasswordHash },
    create: {
      role: Role.ADMIN,
      phone: adminPhone,
      passwordHash: adminPasswordHash,
      adminProfile: {
        create: {
          fullName: "Demo Principal",
          designation: "Headmaster",
        },
      },
    },
  });

  // 4. Teacher User
  const teacherPasswordHash = await bcrypt.hash(teacherPassword, 10);
  const teacherUser = await prisma.user.upsert({
    where: { phone: teacherPhone },
    update: { passwordHash: teacherPasswordHash },
    create: {
      role: Role.TEACHER,
      phone: teacherPhone,
      passwordHash: teacherPasswordHash,
      teacher: {
        create: {
          employeeCode: "TCH-DEMO-01",
          fullName: "Demo Assistant Teacher",
          designation: "Assistant Teacher",
          qualification: "B.Sc., B.Ed.",
          gender: Gender.FEMALE,
        },
      },
    },
    include: { teacher: true },
  });

  const teacherId = teacherUser.teacher!.id;

  // 5. Classes 1 to 8 + Sections + Core Subjects
  const classRecords: { id: string; name: string; sectionId: string; subjectId: string }[] = [];

  for (let i = 1; i <= 8; i++) {
    const className = String(i);
    const cls = await prisma.class.upsert({
      where: { name_sessionId: { name: className, sessionId: session.id } },
      update: {},
      create: { name: className, sessionId: session.id },
    });

    const sec = await prisma.section.upsert({
      where: { name_classId: { name: className, classId: cls.id } },
      update: {},
      create: { name: className, classId: cls.id, classTeacherId: i === 5 ? teacherId : null },
    });

    const sub = await prisma.subject.upsert({
      where: { name_classId: { name: "Hindi / हिन्दी", classId: cls.id } },
      update: {},
      create: { name: "Hindi / हिन्दी", classId: cls.id },
    });

    classRecords.push({ id: cls.id, name: className, sectionId: sec.id, subjectId: sub.id });
  }

  // Assign Class 5 Hindi to Demo Teacher
  const class5 = classRecords.find((c) => c.name === "5")!;
  await prisma.teacherSubject.upsert({
    where: {
      teacherId_subjectId: {
        teacherId,
        subjectId: class5.subjectId,
      },
    },
    update: {},
    create: {
      teacherId,
      subjectId: class5.subjectId,
    },
  });

  // 6. 16 Synthetic Students (2 per Class across Classes 1–8)
  const syntheticStudentNames = [
    { name: "Aarav Sharma", gender: Gender.MALE, classNum: 1, dob: "2019-05-12" },
    { name: "Ananya Verma", gender: Gender.FEMALE, classNum: 1, dob: "2019-08-20" },
    { name: "Rohan Patel", gender: Gender.MALE, classNum: 2, dob: "2018-03-15" },
    { name: "Priya Singh", gender: Gender.FEMALE, classNum: 2, dob: "2018-11-04" },
    { name: "Vikram Yadav", gender: Gender.MALE, classNum: 3, dob: "2017-06-22" },
    { name: "Sneha Gupta", gender: Gender.FEMALE, classNum: 3, dob: "2017-09-17" },
    { name: "Amit Kumar", gender: Gender.MALE, classNum: 4, dob: "2016-01-30" },
    { name: "Pooja Kumari", gender: Gender.FEMALE, classNum: 4, dob: "2016-07-08" },
    { name: "Neha Chauhan", gender: Gender.FEMALE, classNum: 5, dob: "2015-04-14" },
    { name: "Rahul Maurya", gender: Gender.MALE, classNum: 5, dob: "2015-12-05" },
    { name: "Kavita Tiwari", gender: Gender.FEMALE, classNum: 6, dob: "2014-02-18" },
    { name: "Deepak Joshi", gender: Gender.MALE, classNum: 6, dob: "2014-10-25" },
    { name: "Sunil Verma", gender: Gender.MALE, classNum: 7, dob: "2013-05-11" },
    { name: "Ritu Mishra", gender: Gender.FEMALE, classNum: 7, dob: "2013-09-03" },
    { name: "Manish Pandey", gender: Gender.MALE, classNum: 8, dob: "2012-03-19" },
    { name: "Divya Rawat", gender: Gender.FEMALE, classNum: 8, dob: "2012-08-27" },
  ];

  const studentEntities: { id: string; admissionNo: string; fullName: string; sectionId: string; classNum: number }[] = [];

  for (let idx = 0; idx < syntheticStudentNames.length; idx++) {
    const s = syntheticStudentNames[idx];
    const admNo = String(idx + 1).padStart(3, "0");
    const classInfo = classRecords.find((c) => c.name === String(s.classNum))!;

    const placeholderPhone = `DEMO-${admNo}-${Date.now().toString().slice(-4)}`;
    const studentUser = await prisma.user.upsert({
      where: { phone: placeholderPhone },
      update: {},
      create: {
        role: Role.STUDENT,
        phone: placeholderPhone,
        isActive: true,
      },
    });

    const student = await prisma.student.upsert({
      where: { admissionNo: admNo },
      update: {},
      create: {
        userId: studentUser.id,
        admissionNo: admNo,
        fullName: s.name,
        dob: new Date(s.dob),
        gender: s.gender,
        sectionId: classInfo.sectionId,
        category: "General",
        villageOrMohalla: "Demo Village",
        district: "Demo District",
        guardians: {
          create: [
            {
              relation: "FATHER",
              fullName: `Parent of ${s.name}`,
              isPrimaryContact: true,
            },
          ],
        },
      },
    });

    await prisma.enrollmentHistory.upsert({
      where: { studentId_sessionId: { studentId: student.id, sessionId: session.id } },
      update: {},
      create: {
        studentId: student.id,
        sessionId: session.id,
        sectionId: classInfo.sectionId,
        className: String(s.classNum),
        sectionName: String(s.classNum),
        action: "ADMIT",
        performedById: adminUser.id,
      },
    });

    studentEntities.push({
      id: student.id,
      admissionNo: admNo,
      fullName: s.name,
      sectionId: classInfo.sectionId,
      classNum: s.classNum,
    });
  }

  // 7. 30 Days of Attendance Records
  console.log("Seeding 30 days of attendance...");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    const dayOfWeek = date.getDay(); // 0 is Sunday

    if (dayOfWeek === 0) continue; // Skip Sunday

    for (let sIdx = 0; sIdx < studentEntities.length; sIdx++) {
      const student = studentEntities[sIdx];
      // 14 present, 2 absent per day
      const isPresent = sIdx < 14;
      await prisma.attendance.upsert({
        where: {
          studentId_date: {
            studentId: student.id,
            date,
          },
        },
        update: {},
        create: {
          studentId: student.id,
          sessionId: session.id,
          date,
          status: isPresent ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT,
          markedById: teacherUser.id,
        },
      });
    }

    // 8. MDM Daily Log + Items Selection
    const dailyLog = await prisma.mDMDailyLog.upsert({
      where: {
        date_mealType: {
          date,
          mealType: MealType.LUNCH,
        },
      },
      update: {},
      create: {
        sessionId: session.id,
        date,
        mealType: MealType.LUNCH,
        menuDescription: "Primary: 100g + Junior: 150g + Fruit (₹4) + Conversion Cost",
        eligibleStudents: 16,
        presentStudents: 14,
        mealsServed: 14,
        loggedById: adminUser.id,
      },
    });

    await prisma.mDMDailyItemSelection.upsert({
      where: { date },
      update: {},
      create: {
        date,
        rice: true,
        wheat: true,
        fruits: true,
        nutrition: false,
        milk: false,
        riceMenu: "Tehri / तहरी",
        wheatMenu: "Roti / रोटी",
      },
    });

    // Student fruit consumption for 14 present students
    for (let sIdx = 0; sIdx < 14; sIdx++) {
      await prisma.mDMStudentAttendance.upsert({
        where: {
          dailyLogId_studentId: {
            dailyLogId: dailyLog.id,
            studentId: studentEntities[sIdx].id,
          },
        },
        update: {},
        create: {
          dailyLogId: dailyLog.id,
          studentId: studentEntities[sIdx].id,
          didEat: true,
        },
      });
    }
  }

  // 9. Academic Marks (Class 5 Hindi)
  console.log("Seeding marks...");
  const class5Students = studentEntities.filter((s) => s.classNum === 5);
  for (const s of class5Students) {
    await prisma.mark.upsert({
      where: {
        studentId_subjectId_sessionId_examTerm: {
          studentId: s.id,
          subjectId: class5.subjectId,
          sessionId: session.id,
          examTerm: "UNIT_TEST_1",
        },
      },
      update: {},
      create: {
        studentId: s.id,
        subjectId: class5.subjectId,
        sessionId: session.id,
        examTerm: "UNIT_TEST_1",
        marksObtained: 8.5,
        maxMarks: 10,
        enteredById: teacherUser.id,
      },
    });

    await prisma.mark.upsert({
      where: {
        studentId_subjectId_sessionId_examTerm: {
          studentId: s.id,
          subjectId: class5.subjectId,
          sessionId: session.id,
          examTerm: "HALF_YEARLY",
        },
      },
      update: {},
      create: {
        studentId: s.id,
        subjectId: class5.subjectId,
        sessionId: session.id,
        examTerm: "HALF_YEARLY",
        marksObtained: 26.0,
        maxMarks: 30,
        enteredById: teacherUser.id,
      },
    });
  }

  // 10. Two Leave Requests (One Approved, One Pending)
  console.log("Seeding leave requests...");
  const pastLeaveStart = new Date(today);
  pastLeaveStart.setDate(pastLeaveStart.getDate() - 10);
  const pastLeaveEnd = new Date(pastLeaveStart);
  pastLeaveEnd.setDate(pastLeaveEnd.getDate() + 1);

  await prisma.leaveRequest.create({
    data: {
      applicantType: LeaveApplicantType.TEACHER,
      teacherId,
      leaveType: LeaveType.CASUAL_LEAVE,
      fromDate: pastLeaveStart,
      toDate: pastLeaveEnd,
      reason: "Urgent personal family matter (Demo leave record)",
      status: LeaveStatus.APPROVED,
      reviewedById: adminUser.id,
      reviewedAt: new Date(pastLeaveStart),
    },
  });

  const futureLeaveStart = new Date(today);
  futureLeaveStart.setDate(futureLeaveStart.getDate() + 5);
  const futureLeaveEnd = new Date(futureLeaveStart);
  futureLeaveEnd.setDate(futureLeaveEnd.getDate() + 1);

  await prisma.leaveRequest.create({
    data: {
      applicantType: LeaveApplicantType.TEACHER,
      teacherId,
      leaveType: LeaveType.CASUAL_LEAVE,
      fromDate: futureLeaveStart,
      toDate: futureLeaveEnd,
      reason: "Attending state academic training session (Demo leave record)",
      status: LeaveStatus.PENDING,
    },
  });

  // 11. One Issued Transfer Certificate
  console.log("Seeding issued Transfer Certificate...");
  const tcStudent = studentEntities.find((s) => s.fullName === "Divya Rawat")!;
  await prisma.transferCertificate.upsert({
    where: { tcNumber: "TC-2026-0001" },
    update: {},
    create: {
      studentId: tcStudent.id,
      tcNumber: "TC-2026-0001",
      studentNameSnapshot: tcStudent.fullName,
      fatherNameSnapshot: "Parent of Divya Rawat",
      dobSnapshot: new Date("2012-08-27"),
      dobWordsSnapshot: "Twenty Seventh August Two Thousand Twelve",
      lastClassStudied: "8",
      currentSessionLabel: "2026-2027",
      dateOfLeaving: today,
      reasonForLeaving: "Completed elementary education / कक्षा 8 उत्तीर्ण",
      conduct: "Good",
      subjectsStudied: ["Hindi", "Mathematics", "Science", "Social Science"],
      status: TCStatus.ISSUED,
      issuedById: adminUser.id,
    },
  });

  // 12. Two Broadcast Notices
  console.log("Seeding broadcast notices...");
  await prisma.notice.create({
    data: {
      title: "Demo Announcement: Mid-Term Academic Progress Evaluation",
      body: "All student evaluation registers and statutory attendance sheets have been generated for demonstration purposes.",
      audience: NoticeAudience.ALL,
      postedById: adminUser.id,
    },
  });

  await prisma.notice.create({
    data: {
      title: "Demo Staff Notice: Lesson Planning & MDM Review",
      body: "Weekly mid-day meal reports and timetable distributions are available in the administrative dashboard.",
      audience: NoticeAudience.TEACHERS,
      postedById: adminUser.id,
    },
  });

  console.log("==================================================================");
  console.log("Synthetic demo database seed completed successfully.");
  console.log(`Demo Admin phone:   ${adminPhone}`);
  console.log(`Demo Teacher phone: ${teacherPhone}`);
  console.log("Total synthetic students: 16 across Classes 1 to 8");
  console.log("Attendance, MDM daily logs, marks, leaves, TC, and notices seeded.");
  console.log("==================================================================");
}

main()
  .catch((e) => {
    console.error("Seed execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
