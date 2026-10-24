import { describe, it, expect } from "vitest";
import {
  buildTCSnapshot,
  DEFAULT_TC_SUBJECTS,
  StudentProfileForTC,
  TCIssuanceFormInput,
} from "@/lib/tc-snapshot";

describe("Transfer Certificate (TC) - Snapshot Builder & Immutability", () => {
  it("builds a complete frozen snapshot from student profile and issuance input", () => {
    const student: StudentProfileForTC = {
      id: "std-101",
      fullName: "Ananya Sharma",
      dob: new Date("2014-06-15T00:00:00Z"),
      dobInWords: "Fifteenth June Two Thousand Fourteen",
      aadhaarNumber: "123456789012",
      penNumber: "PEN-998877",
      apaarId: "APAAR-112233",
      category: "GEN",
      religion: "Hindu",
      villageOrMohalla: "Tarhar",
      postOffice: "Chandpur",
      developmentBlock: "Karchhana",
      district: "Prayagraj",
      pincode: "212301",
      admissionDate: new Date("2020-07-01T00:00:00Z"),
      previousClassPassed: "Class 1",
      guardians: [
        { relation: "FATHER", fullName: "Vikram Sharma" },
        { relation: "MOTHER", fullName: "Meena Sharma" },
      ],
      currentSessionLabel: "2025-2026",
    };

    const input: TCIssuanceFormInput = {
      tcNumber: "TC-2026-0042",
      dateOfIssue: new Date("2026-03-31T00:00:00Z"),
      dateOfLeaving: new Date("2026-03-30T00:00:00Z"),
      reasonForLeaving: "Parents relocated to Kanpur",
      conduct: "Exemplary",
      lastClassStudied: "Class 5",
      promotedTo: "Class 6",
      workingDaysTotal: 220,
      workingDaysPresent: 208,
      remarks: "Passed with distinction",
    };

    const snapshot = buildTCSnapshot(student, input);

    expect(snapshot.studentId).toBe("std-101");
    expect(snapshot.tcNumber).toBe("TC-2026-0042");
    expect(snapshot.studentNameSnapshot).toBe("Ananya Sharma");
    expect(snapshot.fatherNameSnapshot).toBe("Vikram Sharma");
    expect(snapshot.motherNameSnapshot).toBe("Meena Sharma");
    expect(snapshot.dobSnapshot).toEqual(new Date("2014-06-15T00:00:00Z"));
    expect(snapshot.dobWordsSnapshot).toBe("Fifteenth June Two Thousand Fourteen");
    expect(snapshot.aadhaarSnapshot).toBe("123456789012");
    expect(snapshot.penNumberSnapshot).toBe("PEN-998877");
    expect(snapshot.apaarIdSnapshot).toBe("APAAR-112233");
    expect(snapshot.categorySnapshot).toBe("GEN");
    expect(snapshot.religionSnapshot).toBe("Hindu");
    expect(snapshot.addressSnapshot).toBe("Tarhar, Chandpur, Karchhana, Prayagraj, 212301");
    expect(snapshot.dateOfIssue).toEqual(new Date("2026-03-31T00:00:00Z"));
    expect(snapshot.admissionDateSnapshot).toEqual(new Date("2020-07-01T00:00:00Z"));
    expect(snapshot.classOfAdmissionSnapshot).toBe("Class 1");
    expect(snapshot.lastClassStudied).toBe("Class 5");
    expect(snapshot.currentSessionLabel).toBe("2025-2026");
    expect(snapshot.dateOfLeaving).toEqual(new Date("2026-03-30T00:00:00Z"));
    expect(snapshot.reasonForLeaving).toBe("Parents relocated to Kanpur");
    expect(snapshot.conduct).toBe("Exemplary");
    expect(snapshot.subjectsStudied).toEqual(DEFAULT_TC_SUBJECTS);
    expect(snapshot.promotedTo).toBe("Class 6");
    expect(snapshot.workingDaysTotal).toBe(220);
    expect(snapshot.workingDaysPresent).toBe(208);
    expect(snapshot.remarks).toBe("Passed with distinction");
    expect(snapshot.status).toBe("ISSUED");
  });

  it("freezes snapshot data so subsequent mutations to the student profile do not alter the snapshot", () => {
    const student: StudentProfileForTC = {
      id: "std-102",
      fullName: "Rohan Verma",
      dob: new Date("2015-05-10T00:00:00Z"),
      aadhaarNumber: "998877665544",
      guardians: [
        { relation: "FATHER", fullName: "Sunil Verma" },
        { relation: "MOTHER", fullName: "Anita Verma" },
      ],
      villageOrMohalla: "Bara",
      district: "Prayagraj",
    };

    const input: TCIssuanceFormInput = {
      tcNumber: "TC-2026-0099",
      dateOfIssue: new Date("2026-04-01T00:00:00Z"),
      dateOfLeaving: new Date("2026-03-31T00:00:00Z"),
      reasonForLeaving: "Higher secondary admission",
      lastClassStudied: "Class 8",
    };

    const snapshot = buildTCSnapshot(student, input);

    // Later modification of the source student record (e.g. admin correcting student info)
    student.fullName = "Rohan Kumar Verma (Modified)";
    student.aadhaarNumber = "111122223333";
    student.guardians![0].fullName = "Sunil Kumar Verma";
    student.villageOrMohalla = "New Colony";
    (student.dob as Date).setFullYear(2010);

    // Assert that the snapshot is frozen and retains original values
    expect(snapshot.studentNameSnapshot).toBe("Rohan Verma");
    expect(snapshot.aadhaarSnapshot).toBe("998877665544");
    expect(snapshot.fatherNameSnapshot).toBe("Sunil Verma");
    expect(snapshot.addressSnapshot).toBe("Bara, Prayagraj");
    expect(snapshot.dobSnapshot.getFullYear()).toBe(2015);
  });

  it("handles missing optional guardians and fields gracefully with fallbacks", () => {
    const student: StudentProfileForTC = {
      id: "std-103",
      fullName: "Praveen",
      dob: "2016-08-20",
    };

    const input: TCIssuanceFormInput = {
      tcNumber: "TC-2026-0100",
      dateOfIssue: "2026-04-02",
      dateOfLeaving: "2026-03-31",
      reasonForLeaving: "Transfer",
      lastClassStudied: "3",
    };

    const snapshot = buildTCSnapshot(student, input);

    expect(snapshot.fatherNameSnapshot).toBe("");
    expect(snapshot.motherNameSnapshot).toBe("");
    expect(snapshot.addressSnapshot).toBe("");
    expect(snapshot.aadhaarSnapshot).toBeNull();
    expect(snapshot.penNumberSnapshot).toBeNull();
    expect(snapshot.conduct).toBe("Good");
    expect(snapshot.subjectsStudied).toEqual(DEFAULT_TC_SUBJECTS);
  });
});
