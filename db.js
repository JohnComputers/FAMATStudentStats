/**
 * db.js — Firestore Database Layer
 * Handles all CRUD operations for students, tests, results, and domains.
 *
 * Collections:
 *   students/   { id, name, grade, email, createdAt, teacherId }
 *   tests/      { id, name, date, createdAt, teacherId }
 *   results/    { id, studentId, testId, overallScore, domainScores{}, createdAt, teacherId }
 */

const DB = (() => {
  let db;

  function init() {
    try {
      db = firebase.firestore();
      return true;
    } catch (e) {
      console.error("[DB] Firestore init failed:", e);
      return false;
    }
  }

  function getTeacherId() {
    const user = firebase.auth().currentUser;
    return user ? user.uid : null;
  }

  // ── Students ────────────────────────────────────────────────────────────

  async function getStudents() {
    const tid = getTeacherId();
    if (!tid) return [];
    const snap = await db.collection("students")
      .where("teacherId", "==", tid)
      .orderBy("name")
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function getStudentById(studentId) {
    const doc = await db.collection("students").doc(studentId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  /**
   * Upsert student by externalId (the student ID from CSV).
   * Returns the Firestore doc ID.
   */
  async function upsertStudent({ externalId, name, grade }) {
    const tid = getTeacherId();
    const snap = await db.collection("students")
      .where("teacherId", "==", tid)
      .where("externalId", "==", externalId)
      .limit(1)
      .get();

    if (!snap.empty) {
      // Update name/grade if changed
      await snap.docs[0].ref.update({ name, grade: grade || snap.docs[0].data().grade });
      return snap.docs[0].id;
    }

    const ref = await db.collection("students").add({
      externalId,
      name,
      grade: grade || "",
      teacherId: tid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
  }

  // ── Tests ───────────────────────────────────────────────────────────────

  async function getTests() {
    const tid = getTeacherId();
    if (!tid) return [];
    const snap = await db.collection("tests")
      .where("teacherId", "==", tid)
      .orderBy("date", "desc")
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  /**
   * Upsert test by name + date combination.
   * Returns Firestore doc ID.
   */
  async function upsertTest({ name, date }) {
    const tid = getTeacherId();
    const snap = await db.collection("tests")
      .where("teacherId", "==", tid)
      .where("name", "==", name)
      .where("date", "==", date)
      .limit(1)
      .get();

    if (!snap.empty) return snap.docs[0].id;

    const ref = await db.collection("tests").add({
      name,
      date,
      teacherId: tid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
  }

  // ── Results ─────────────────────────────────────────────────────────────

  async function getResults(filters = {}) {
    const tid = getTeacherId();
    if (!tid) return [];
    let q = db.collection("results").where("teacherId", "==", tid);
    if (filters.studentId) q = q.where("studentId", "==", filters.studentId);
    if (filters.testId) q = q.where("testId", "==", filters.testId);
    const snap = await q.orderBy("testDate", "desc").get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function getResultsForStudent(studentId) {
    return getResults({ studentId });
  }

  async function getResultsForTest(testId) {
    return getResults({ testId });
  }

  /**
   * Insert result — prevents duplicates (same student + test).
   * Returns { inserted: bool, id: string }.
   */
  async function insertResult({ studentId, testId, testDate, overallScore, domainScores }) {
    const tid = getTeacherId();
    const snap = await db.collection("results")
      .where("teacherId", "==", tid)
      .where("studentId", "==", studentId)
      .where("testId", "==", testId)
      .limit(1)
      .get();

    if (!snap.empty) {
      return { inserted: false, id: snap.docs[0].id, duplicate: true };
    }

    const ref = await db.collection("results").add({
      studentId,
      testId,
      testDate,
      overallScore: Number(overallScore),
      domainScores: domainScores || {},
      teacherId: tid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return { inserted: true, id: ref.id };
  }

  // ── Analytics helpers ───────────────────────────────────────────────────

  /**
   * Get all results with denormalized student + test names.
   * (Fetches all collections and joins in JS to avoid composite indexes)
   */
  async function getAllResultsEnriched() {
    const [students, tests, results] = await Promise.all([
      getStudents(), getTests(), getResults()
    ]);
    const studentMap = Object.fromEntries(students.map(s => [s.id, s]));
    const testMap = Object.fromEntries(tests.map(t => [t.id, t]));

    return results.map(r => ({
      ...r,
      student: studentMap[r.studentId] || { name: "Unknown", externalId: "?" },
      test: testMap[r.testId] || { name: "Unknown", date: "" }
    }));
  }

  /**
   * Get class averages per test.
   */
  async function getClassAverages() {
    const results = await getAllResultsEnriched();
    const byTest = {};
    results.forEach(r => {
      const key = r.testId;
      if (!byTest[key]) {
        byTest[key] = {
          testId: key,
          testName: r.test.name,
          testDate: r.test.date,
          scores: [],
          domainTotals: {}
        };
      }
      byTest[key].scores.push(r.overallScore);
      Object.entries(r.domainScores || {}).forEach(([domain, score]) => {
        if (!byTest[key].domainTotals[domain]) byTest[key].domainTotals[domain] = [];
        byTest[key].domainTotals[domain].push(Number(score));
      });
    });

    return Object.values(byTest).map(t => ({
      testId: t.testId,
      testName: t.testName,
      testDate: t.testDate,
      count: t.scores.length,
      average: t.scores.length
        ? Math.round(t.scores.reduce((a, b) => a + b, 0) / t.scores.length * 10) / 10
        : 0,
      domainAverages: Object.fromEntries(
        Object.entries(t.domainTotals).map(([d, scores]) => [
          d, Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10
        ])
      )
    })).sort((a, b) => a.testDate.localeCompare(b.testDate));
  }

  /**
   * Get growth metrics per student (first vs latest test).
   */
  async function getGrowthMetrics() {
    const results = await getAllResultsEnriched();
    const byStudent = {};
    results.forEach(r => {
      if (!byStudent[r.studentId]) byStudent[r.studentId] = { student: r.student, results: [] };
      byStudent[r.studentId].results.push(r);
    });

    return Object.values(byStudent)
      .filter(s => s.results.length >= 2)
      .map(s => {
        const sorted = s.results.slice().sort((a, b) => a.testDate.localeCompare(b.testDate));
        const first = sorted[0];
        const latest = sorted[sorted.length - 1];
        const growth = latest.overallScore - first.overallScore;
        return {
          student: s.student,
          testCount: s.results.length,
          firstScore: first.overallScore,
          latestScore: latest.overallScore,
          growth,
          pctChange: first.overallScore > 0
            ? Math.round(growth / first.overallScore * 1000) / 10
            : 0
        };
      })
      .sort((a, b) => b.growth - a.growth);
  }

  return { init, getStudents, getStudentById, upsertStudent, getTests, upsertTest,
           getResults, getResultsForStudent, getResultsForTest, insertResult,
           getAllResultsEnriched, getClassAverages, getGrowthMetrics };
})();
