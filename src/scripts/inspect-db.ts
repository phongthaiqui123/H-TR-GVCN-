import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function main() {
  console.log('--- START INSPECTION ---');
  const classesSnap = await getDocs(collection(db, 'classes'));
  console.log('CLASSES COUNT:', classesSnap.size);
  const classes: any[] = [];
  classesSnap.forEach(d => {
    classes.push({ id: d.id, ...d.data() });
    console.log('FULL CLASS DATA:', JSON.stringify(d.data(), null, 2));
  });

  const criteriaSnap = await getDocs(collection(db, 'criteria'));
  console.log('CRITERIA COUNT:', criteriaSnap.size);
  criteriaSnap.forEach(d => {
    const data = d.data();
    console.log('CRITERION:', d.id, '| classId:', data.classId, '| name:', data.name, '| code:', data.code, '| pos:', data.positiveScore, '| neg:', data.negativeScore);
  });

  const teamsSnap = await getDocs(collection(db, 'teams'));
  console.log('TEAMS COUNT:', teamsSnap.size);
  teamsSnap.forEach(d => {
    const data = d.data();
    console.log('TEAM:', d.id, '| classId:', data.classId, '| name:', data.teamName, '| number:', data.teamNumber, '| isDemo:', data.isDemo);
  });

  const studentsSnap = await getDocs(collection(db, 'students'));
  console.log('STUDENTS COUNT:', studentsSnap.size);
  studentsSnap.forEach(d => {
    const data = d.data();
    console.log('STUDENT:', d.id, '| classId:', data.classId, '| name:', data.fullName, '| team:', data.teamName, '| cadreRole:', data.cadreRole, '| isTeamLeader:', data.isTeamLeader, '| isDemo:', data.isDemo);
  });

  console.log('--- END INSPECTION ---');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
