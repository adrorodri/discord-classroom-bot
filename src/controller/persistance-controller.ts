import {Observable} from "rxjs";
import {map, mapTo, switchMap, tap} from "rxjs/operators";
import firebase from 'firebase/app';
import 'firebase/database';
import {firebaseConfig} from "../firebase-config";
import {fromPromise} from "rxjs/internal-compatibility";
import {firestore} from "firebase-admin/lib/firestore";
import {Resource, Session} from "../model/session";
import {NotRegisteredError} from "../errors/not-registered.error";
import admin = require('firebase-admin');
import WriteResult = firestore.WriteResult;
import {Activity} from "../model/activity";

export class PersistanceController {
    private app = firebase.initializeApp(firebaseConfig);
    private db: firestore.Firestore;

    private KEYS = {
        USERS: 'users',
        SESSIONS: 'sessions',
        ACTIVITIES: 'activities'
    }

    constructor(private classId) {
        const serviceAccount = require('../service-account.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        this.db = admin.firestore();
    }

    getRegisteredStudents = (): Observable<any> => {
        const docRef = this.db.collection(this.KEYS.USERS);
        return fromPromise(docRef.get()).pipe(map(querySnapshot => querySnapshot.docs.map(doc => doc.data())));
    }

    putRegisteredStudent(discordId: string, universityId: string): Observable<any> {
        const docRef = this.db.collection(this.KEYS.USERS).doc(universityId);
        return fromPromise(docRef.set({
            discordId: discordId,
            attendance: []
        }));
    }

    setAttendanceForDiscordId = (discordId: string, date: string): Observable<any> => {
        const getUniversityIdFromDiscordId = (discordId): Observable<string> => {
            const docRef = this.db.collection(this.KEYS.USERS).where('discordId', '==', discordId);
            return fromPromise(docRef.get()).pipe(
                tap(queryResult => {
                    if (queryResult.empty) {
                        throw new NotRegisteredError();
                    }
                }),
                map(queryResult => queryResult.docs[0].id)
            );
        }
        const addAttendanceToUser = (universityId): Observable<WriteResult> => {
            const userDocRef = this.db.collection(this.KEYS.USERS).doc(universityId);
            return fromPromise(userDocRef.update({
                attendance: admin.firestore.FieldValue.arrayUnion(date)
            }));
        }
        const addAttendanceToSession = (universityId): Observable<WriteResult> => {
            const attendanceDocRef = this.db.collection(this.KEYS.SESSIONS).doc(date);
            return fromPromise(attendanceDocRef.update({
                attendance: admin.firestore.FieldValue.arrayUnion(universityId)
            }));
        }
        return getUniversityIdFromDiscordId(discordId).pipe(
            switchMap(universityId => addAttendanceToUser(universityId).pipe(
                switchMap(() => addAttendanceToSession(universityId))
            ))
        );
    }

    createNewSession(date: string, resources: Resource[]): Observable<Session> {
        const sessionDocRef = this.db.collection(this.KEYS.SESSIONS).doc(date);
        const sessionObj: Session = {
            attendance: [],
            resources: resources
        };
        return fromPromise(sessionDocRef.create(sessionObj)).pipe(mapTo(sessionObj));
    }

    createNewActivity(name: string, date: string, resources: Resource[]): Observable<Activity> {
        const activityDocRef = this.db.collection(this.KEYS.ACTIVITIES).doc(date);
        const activityObj: Activity = {
            name: name,
            date: date,
            resources: resources
        };
        return fromPromise(activityDocRef.create(activityObj)).pipe(mapTo(activityObj));
    }

    getSessionForDate(today: string): Observable<Session> {
        const sessionDocRef = this.db.collection(this.KEYS.SESSIONS).doc(today);
        return fromPromise(sessionDocRef.get()).pipe(map(snapshot => snapshot.data() as Session));
    }
}