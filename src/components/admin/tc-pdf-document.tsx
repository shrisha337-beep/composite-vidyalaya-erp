"use client";

import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { getSchoolBranding, type SchoolBranding } from "@/lib/branding";

// Register Noto Sans Devanagari font to support Hindi text rendering in PDF
Font.register({
  family: "Noto Sans Devanagari",
  src: "https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf",
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Noto Sans Devanagari",
    fontSize: 10,
    lineHeight: 1.4,
    color: "#2d3748",
  },
  borderContainer: {
    borderWidth: 2,
    borderColor: "#800000", // Maroon border matches school theme
    padding: 15,
    height: "100%",
  },
  header: {
    alignItems: "center",
    marginBottom: 15,
  },
  titleHindi: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#800000",
  },
  titleEnglish: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#800000",
    marginTop: 2,
  },
  schoolName: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  schoolMeta: {
    fontSize: 9,
    color: "#718096",
    marginTop: 2,
  },
  topMetadata: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e0",
    paddingBottom: 6,
    marginBottom: 15,
  },
  metaText: {
    fontSize: 9,
  },
  twoColumnContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    flex: 1,
  },
  leftColumn: {
    width: "48%",
    flexDirection: "column",
  },
  rightColumn: {
    width: "48%",
    flexDirection: "column",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 2,
  },
  label: {
    fontSize: 8.5,
    color: "#4a5568",
    width: "55%",
  },
  value: {
    fontSize: 9,
    color: "#1a202c",
    width: "45%",
    textAlign: "right",
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#800000",
    marginTop: 10,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#800000",
    paddingBottom: 2,
  },
  footer: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#cbd5e0",
    paddingTop: 10,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#4a5568",
    width: 140,
    textAlign: "center",
    paddingTop: 4,
    fontSize: 8.5,
  },
  noteBlock: {
    fontSize: 7.5,
    color: "#718096",
    width: "50%",
  },
});

export function TcPdfDocument({
  tc,
  student,
  branding,
}: {
  tc: any;
  student: any;
  branding?: SchoolBranding;
}) {
  const activeBranding = branding ?? getSchoolBranding();
  const dob = new Date(tc.dobSnapshot);
  const dobFormatted = dob.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const formattedIssueDate = new Date(tc.dateOfIssue).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const formattedLeavingDate = new Date(tc.dateOfLeaving).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const formattedAdmissionDate = tc.admissionDateSnapshot
    ? new Date(tc.admissionDateSnapshot).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "-";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.borderContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.titleHindi}>स्थानान्तरण प्रमाण पत्र</Text>
            <Text style={styles.titleEnglish}>Transfer Certificate</Text>
            <Text style={styles.schoolName}>{activeBranding.schoolNameCombined}</Text>
            <Text style={styles.schoolMeta}>
              {activeBranding.tcAddressMeta}
            </Text>
          </View>

          {/* Top metadata */}
          <View style={styles.topMetadata}>
            <Text style={styles.metaText}>
              U-DISE Code: {activeBranding.isDemo ? activeBranding.udiseCode : (tc.udiseCode || "Pending Allotment")}
            </Text>
            <Text style={styles.metaText}>Serial No / क्रम संख्या: {tc.tcNumber}</Text>
          </View>

          {/* Two Columns Layout */}
          <View style={styles.twoColumnContainer}>
            {/* Left Column */}
            <View style={styles.leftColumn}>
              <View style={styles.row}>
                <Text style={styles.label}>छात्र/छात्रा का नाम (Student Name)</Text>
                <Text style={styles.value}>{tc.studentNameSnapshot}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>(P.E.N.) Number</Text>
                <Text style={styles.value}>{tc.penNumberSnapshot || "-"}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Unique I.D. / APAAR ID</Text>
                <Text style={styles.value}>{tc.apaarIdSnapshot || "-"}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>जन्मतिथि (अंकों में) (DOB in numbers)</Text>
                <Text style={styles.value}>{dobFormatted}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>जन्मतिथि (शब्दों में) (DOB in words)</Text>
                <Text style={styles.value}>{tc.dobWordsSnapshot || "-"}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>माता का नाम श्रीमती (Mother Name)</Text>
                <Text style={styles.value}>{tc.motherNameSnapshot || "-"}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>पिता का नाम श्री (Father Name)</Text>
                <Text style={styles.value}>{tc.fatherNameSnapshot || "-"}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>वर्ग, जाति, धर्म (Category / Religion)</Text>
                <Text style={styles.value}>
                  {tc.categorySnapshot || "-"} / {tc.religionSnapshot || "-"}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>निवास स्थान (Address)</Text>
                <Text style={styles.value}>{tc.addressSnapshot || "-"}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>राष्ट्रीयता (Nationality)</Text>
                <Text style={styles.value}>Indian / भारतीय</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>उत्तर प्रदेश में रहने की अवधि</Text>
                <Text style={styles.value}>{student.durationOfStayInUP || "-"}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>प्रवेश रजिस्टर की क्रम संख्या (SR No)</Text>
                <Text style={styles.value}>{student.admissionNo}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>विद्यालय प्रवेश का दिनांक (Admission Date)</Text>
                <Text style={styles.value}>{formattedAdmissionDate}</Text>
              </View>
            </View>

            {/* Right Column */}
            <View style={styles.rightColumn}>
              <View style={styles.row}>
                <Text style={styles.label}>आधार संख्या (Aadhaar Number)</Text>
                <Text style={styles.value}>{tc.aadhaarSnapshot || "-"}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>नाम काटने का कारण</Text>
                <Text style={styles.value}>{tc.reasonForLeaving}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>आचरण (Conduct)</Text>
                <Text style={styles.value}>{tc.conduct}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>परीक्षा उत्तीर्ण की (Exam Passed)</Text>
                <Text style={styles.value}>{tc.promotedTo || "-"}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>अथवा कक्षा जिससे नाम कटा</Text>
                <Text style={styles.value}>{tc.lastClassStudied}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>विद्यार्थी की भाषा (Medium)</Text>
                <Text style={styles.value}>Hindi / हिन्दी</Text>
              </View>

              <Text style={styles.sectionTitle}>अन्य आवश्यक सूचना (Other details)</Text>

              <View style={styles.row}>
                <Text style={styles.label}>स्कूल खुलने के दिन की संख्या</Text>
                <Text style={styles.value}>{tc.workingDaysTotal || "-"}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>विद्यार्थी की उपस्थिति (Attendance)</Text>
                <Text style={styles.value}>{tc.workingDaysPresent || "-"}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>पिता/अभिभावक का व्यवसाय (Occupation)</Text>
                <Text style={styles.value}>{student.guardians?.[0]?.occupation || "-"}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>नाम काटने का दिनांक (Leaving Date)</Text>
                <Text style={styles.value}>{formattedLeavingDate}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>जारी करने का दिनांक (Issue Date)</Text>
                <Text style={styles.value}>{formattedIssueDate}</Text>
              </View>
            </View>
          </View>

          {/* Footer and Signatures */}
          <View style={styles.footer}>
            <View style={styles.noteBlock}>
              <Text>नोट: १. सर्टिफिकेट का लेख प्रवेश रजिस्टर के अनुसार हो।</Text>
              <Text>२. स्कूल छोड़ते समय आयु की गणना नाम काटने की तिथि तक की जाए।</Text>
            </View>
            <View style={styles.signatureLine}>
              <Text>हस्ताक्षर प्रधानाध्यापक (HM Signature)</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
