import {Observable, of} from "rxjs";
import {map, mapTo, switchMap, tap} from "rxjs/operators";
import firebase from 'firebase/app';
import 'firebase/database';
import {firebaseConfig} from "../firebase-config";
import {fromPromise} from "rxjs/internal-compatibility";
import {firestore} from "firebase-admin/lib/firestore";
import {Resource, Session} from "../model/session";
import {NotRegisteredError} from "../errors/not-registered.error";
import {Activity} from "../model/activity";
import {ClassUser, UserActivity} from "../model/class-user";
import {Student} from "../model/student";
import * as rm from 'typed-rest-client/RestClient'
import admin = require('firebase-admin');
import WriteResult = firestore.WriteResult;
import {DateUtils} from "../utils/date-utils";
import DocumentData = firebase.firestore.DocumentData;

export class PersistenceController {
    private app = firebase.initializeApp(firebaseConfig);
    private db: firestore.Firestore;
    private client: rm.RestClient;

    private KEYS = {
        USERS: {
            key: 'users',
            discordId: 'discordId',
            attendance: 'attendance',
            participations: 'participations',
            activities: 'activities',
            activities_grades: 'activities_grades',
            exams_grades: 'exams_grades',
            participations_grades: 'participations_grades'
        },
        SESSIONS: {
            key: 'sessions',
            name: 'name',
            date: 'date',
            attendanceCode: 'attendanceCode',
            attendance: 'attendance',
            participations: 'participations',
            resources: 'resources'
        },
        ACTIVITIES: {
            key: 'activities',
            name: 'name',
            date: 'date',
            resources: 'resources'
        }
    }

    constructor(private classId) {
        const serviceAccount = require('../service-account.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        this.db = admin.firestore();
        this.client = new rm.RestClient('discord-bot');
    }

    getRegisteredStudents = (): Observable<Student[]> => {
        const docRef = this.db.collection(this.KEYS.USERS.key);
        return fromPromise(docRef.get()).pipe(
            map(querySnapshot => querySnapshot.docs.map(doc => doc.data() as Student))
        );
    }

    putRegisteredStudent(discordId: string, universityId: string): Observable<any> {
        const docRef = this.db.collection(this.KEYS.USERS.key).doc(universityId);
        return fromPromise(docRef.set({
            [this.KEYS.USERS.discordId]: discordId,
            [this.KEYS.USERS.attendance]: [],
            [this.KEYS.USERS.participations]: [],
            [this.KEYS.USERS.activities]: [],
            [this.KEYS.USERS.activities_grades]: [],
            [this.KEYS.USERS.exams_grades]: [],
            [this.KEYS.USERS.participations_grades]: []
        }));
    }

    getUniversityIdFromDiscordId = (discordId): Observable<string> => {
        const docRef = this.db.collection(this.KEYS.USERS.key).where('discordId', '==', discordId);
        return fromPromise(docRef.get()).pipe(
            tap(queryResult => {
                if (queryResult.empty) {
                    throw new NotRegisteredError();
                }
            }),
            map(queryResult => queryResult.docs[0].id)
        );
    }

    getDiscordIdFromUniversityId = (universityId): Observable<string> => {
        const docRef = this.db.collection(this.KEYS.USERS.key).doc(universityId);
        return fromPromise(docRef.get()).pipe(
            tap(snapshot => {
                if (!snapshot.exists) {
                    throw new NotRegisteredError();
                }
            }),
            map(snapshot => (snapshot.data() as DocumentData)[this.KEYS.USERS.discordId])
        );
    }

    setAttendanceForDiscordId = (discordId: string, date: string): Observable<any> => {
        const addAttendanceToUser = (universityId): Observable<WriteResult> => {
            const userDocRef = this.db.collection(this.KEYS.USERS.key).doc(universityId);
            return fromPromise(userDocRef.update({
                [this.KEYS.USERS.attendance]: admin.firestore.FieldValue.arrayUnion(date)
            }));
        }
        const addAttendanceToSession = (universityId): Observable<WriteResult> => {
            const attendanceDocRef = this.db.collection(this.KEYS.SESSIONS.key).doc(date);
            return fromPromise(attendanceDocRef.update({
                [this.KEYS.SESSIONS.attendance]: admin.firestore.FieldValue.arrayUnion(universityId)
            }));
        }
        return this.getUniversityIdFromDiscordId(discordId).pipe(
            switchMap(universityId => addAttendanceToUser(universityId).pipe(
                switchMap(() => addAttendanceToSession(universityId))
            ))
        );
    }

    addParticipationForDiscordId = (discordId: string, date: string): Observable<any> => {
        const timestamp = Date.now();
        const addParticipationToUser = (universityId: string): Observable<WriteResult> => {
            const userDocRef = this.db.collection(this.KEYS.USERS.key).doc(universityId);
            return fromPromise(userDocRef.update({
                [this.KEYS.USERS.participations]: admin.firestore.FieldValue.arrayUnion(`${date}_${timestamp}`)
            }));
        }
        const addUserToSessionParticipations = (universityId: string): Observable<WriteResult> => {
            const attendanceDocRef = this.db.collection(this.KEYS.SESSIONS.key).doc(date);
            return fromPromise(attendanceDocRef.update({
                [this.KEYS.SESSIONS.participations]: admin.firestore.FieldValue.arrayUnion(`${universityId}_${timestamp}`)
            }));
        }
        return this.getUniversityIdFromDiscordId(discordId).pipe(
            switchMap(universityId => addParticipationToUser(universityId).pipe(
                switchMap(() => addUserToSessionParticipations(universityId))
            ))
        );
    }

    addActivityPresentationToDiscordId = (discordId: string, date: string, presentation: string): Observable<any> => {
        const time = DateUtils.nowString();
        const addActivityToUser = (universityId: string): Observable<WriteResult> => {
            const userDocRef = this.db.collection(this.KEYS.USERS.key).doc(universityId);
            return fromPromise(userDocRef.update({
                [this.KEYS.USERS.activities]: admin.firestore.FieldValue.arrayUnion({
                    activity: date,
                    time: `${time}`,
                    presentation: presentation
                })
            }));
        }
        return this.getUniversityIdFromDiscordId(discordId).pipe(
            switchMap(universityId => addActivityToUser(universityId))
        );
    }

    createNewSession(name: string, date: string, attendanceCode: string, resources: Resource[]): Observable<Session> {
        const sessionDocRef = this.db.collection(this.KEYS.SESSIONS.key).doc(date);
        const sessionObj = {
            [this.KEYS.SESSIONS.name]: name,
            [this.KEYS.SESSIONS.date]: date,
            [this.KEYS.SESSIONS.attendance]: [],
            [this.KEYS.SESSIONS.attendanceCode]: attendanceCode,
            [this.KEYS.SESSIONS.resources]: resources
        } as any as Session;
        return fromPromise(sessionDocRef.create(sessionObj)).pipe(mapTo(sessionObj));
    }

    createNewActivity(name: string, date: string, resources: Resource[]): Observable<Activity> {
        const activityDocRef = this.db.collection(this.KEYS.ACTIVITIES.key).doc(date);
        const activityObj: Activity = {
            name: name,
            date: date,
            resources: resources
        };
        return fromPromise(activityDocRef.create(activityObj)).pipe(mapTo(activityObj));
    }

    getSessionForDate(today: string): Observable<Session> {
        const sessionDocRef = this.db.collection(this.KEYS.SESSIONS.key).doc(today);
        return fromPromise(sessionDocRef.get()).pipe(map(snapshot => snapshot.data() as Session));
    }

    getActivityForDate(today: string): Observable<Activity> {
        const sessionDocRef = this.db.collection(this.KEYS.ACTIVITIES.key).doc(today);
        return fromPromise(sessionDocRef.get()).pipe(map(snapshot => snapshot.data() as Activity));
    }

    getAllSessions(): Observable<Session[]> {
        const sessionDocRef = this.db.collection(this.KEYS.SESSIONS.key);
        return fromPromise(sessionDocRef.get()).pipe(map(snapshot => snapshot.docs.map(doc => doc.data() as Session)));
    }

    getAttendanceForDiscordId(discordId: string): Observable<string[]> {
        const getAttendanceForUniversityId = (universityId) => {
            const userDocRef = this.db.collection(this.KEYS.USERS.key).doc(universityId);
            return fromPromise(userDocRef.get()).pipe(
                map(snapshot => snapshot.data() as ClassUser),
                map(classUser => classUser.attendance)
            );
        }
        return this.getUniversityIdFromDiscordId(discordId).pipe(
            switchMap(universityId => getAttendanceForUniversityId(universityId))
        );
    }

    getActivitiesForDiscordId(discordId: string): Observable<UserActivity[]> {
        const getActivitiesForUniversityId = (universityId) => {
            const userDocRef = this.db.collection(this.KEYS.USERS.key).doc(universityId);
            return fromPromise(userDocRef.get()).pipe(
                map(snapshot => snapshot.data() as ClassUser),
                map(classUser => classUser.activities)
            );
        }
        return this.getUniversityIdFromDiscordId(discordId).pipe(
            switchMap(universityId => getActivitiesForUniversityId(universityId))
        );
    }

    createTextFileToStorage(message: string): Observable<string> {
        return of("");
    }

    uploadActivityToStorage(discordId: string, activity: string, originalFileName: string, url: string): Observable<string> {
        return of("");
        // const fileName = activity + "_" + DateUtils.nowMillis() + "_" + originalFileName;
        // return fromPromise(this.client.get<Blob>(url)).pipe(
        //     tap(file => {
        //         if (!file) {
        //             throw new InvalidUploadError();
        //         }
        //     }),
        //     switchMap(file => this.getUniversityIdFromDiscordId(discordId).pipe(
        //         switchMap(universityId => new Observable<string>(observer => {
        //             this.storage.ref()
        //                 .child(`${universityId}/${fileName}`)
        //                 .put(<Blob>file.result)
        //                 .catch(error => observer.error(error))
        //                 .then(() => observer.next(universityId))
        //         })),
        //         switchMap(universityId =>
        //             fromPromise(this.storage.ref(`${universityId}/${fileName}`).getDownloadURL())
        //         )
        //     ))
        // );
    }
}