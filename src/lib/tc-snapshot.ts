/**
 * Pure builder for legal Transfer Certificate (TC) frozen snapshots.
 * Ensures demographic and academic details are immutably captured at issuance.
 */

export interface StudentProfileForTC {
  id: string;
  fullName: string;
  dob: Date | string;
  dobInWords?: string | null;
  aadhaarNumber?: string | null;
  penNumber?: string | null;
  apaarId?: string | null;
  category?: string | null;
  religion?: string | null;
  villageOrMohalla?: string | null;
  postOffice?: string | null;
  developmentBlock?: string | null;
  district?: string | null;
  pincode?: string | null;
  admissionDate?: Date | string | null;
  previousClassPassed?: string | null;
  guardians?: Array<{
    relation: string;
    fullName: string;
  }>;
  currentSessionLabel?: string | null;
}

export interface TCIssuanceFormInput {
  tcNumber: string;
  dateOfIssue: Date | string;
  dateOfLeaving: Date | string;
  reasonForLeaving: string;
  conduct?: string;
  lastClassStudied: string;
  currentSessionLabel?: string;
  promotedTo?: string | null;
  workingDaysTotal?: number | null;
  workingDaysPresent?: number | null;
  remarks?: string | null;
  dobInWordsOverride?: string | null;
  decryptedAadhaar?: string | null;
  subjectsStudied?: string[];
}

export interface TCSnapshotResult {
  studentId: string;
  tcNumber: string;
  studentNameSnapshot: string;
  fatherNameSnapshot: string;
  motherNameSnapshot: string;
  dobSnapshot: Date;
  dobWordsSnapshot: string | null;
  aadhaarSnapshot: string | null;
  penNumberSnapshot: string | null;
  apaarIdSnapshot: string | null;
  categorySnapshot: string | null;
  religionSnapshot: string | null;
  addressSnapshot: string;
  dateOfIssue: Date;
  admissionDateSnapshot: Date | null;
  classOfAdmissionSnapshot: string | null;
  lastClassStudied: string;
  currentSessionLabel: string | null;
  dateOfLeaving: Date;
  reasonForLeaving: string;
  conduct: string;
  subjectsStudied: string[];
  promotedTo: string | null;
  workingDaysTotal: number | null;
  workingDaysPresent: number | null;
  remarks: string | null;
  status: "ISSUED";
}

export const DEFAULT_TC_SUBJECTS = [
  "Hindi",
  "English",
  "Mathematics",
  "Science",
  "Social Science",
  "Sanskrit/Urdu",
  "Art/Physical Education",
];

/**
 * Builds an immutable Transfer Certificate snapshot record from student data.
 * All primitive and date values are deep-copied.
 */
export function buildTCSnapshot(
  student: StudentProfileForTC,
  input: TCIssuanceFormInput
): TCSnapshotResult {
  const father = student.guardians?.find((g) => g.relation === "FATHER");
  const mother = student.guardians?.find((g) => g.relation === "MOTHER");

  const address = [
    student.villageOrMohalla,
    student.postOffice,
    student.developmentBlock,
    student.district,
    student.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const subjects = input.subjectsStudied
    ? [...input.subjectsStudied]
    : [...DEFAULT_TC_SUBJECTS];

  return {
    studentId: student.id,
    tcNumber: input.tcNumber,
    studentNameSnapshot: String(student.fullName),
    fatherNameSnapshot: father?.fullName ? String(father.fullName) : "",
    motherNameSnapshot: mother?.fullName ? String(mother.fullName) : "",
    dobSnapshot: new Date(student.dob),
    dobWordsSnapshot: input.dobInWordsOverride || student.dobInWords || null,
    aadhaarSnapshot: input.decryptedAadhaar ?? (student.aadhaarNumber ? String(student.aadhaarNumber) : null),
    penNumberSnapshot: student.penNumber ? String(student.penNumber) : null,
    apaarIdSnapshot: student.apaarId ? String(student.apaarId) : null,
    categorySnapshot: student.category ? String(student.category) : null,
    religionSnapshot: student.religion ? String(student.religion) : null,
    addressSnapshot: address,
    dateOfIssue: new Date(input.dateOfIssue),
    admissionDateSnapshot: student.admissionDate ? new Date(student.admissionDate) : null,
    classOfAdmissionSnapshot: student.previousClassPassed ? String(student.previousClassPassed) : null,
    lastClassStudied: String(input.lastClassStudied),
    currentSessionLabel: input.currentSessionLabel || student.currentSessionLabel || null,
    dateOfLeaving: new Date(input.dateOfLeaving),
    reasonForLeaving: String(input.reasonForLeaving),
    conduct: input.conduct ? String(input.conduct) : "Good",
    subjectsStudied: subjects,
    promotedTo: input.promotedTo ? String(input.promotedTo) : null,
    workingDaysTotal: input.workingDaysTotal ?? null,
    workingDaysPresent: input.workingDaysPresent ?? null,
    remarks: input.remarks ? String(input.remarks) : null,
    status: "ISSUED",
  };
}
