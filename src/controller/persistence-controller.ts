import {defer, Observable, of, throwError} from "rxjs";
import {bufferCount, delay, map, mapTo, repeat, switchMap, tap} from "rxjs/operators";
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
import {DateUtils} from "../utils/date-utils";
import {MessageWithoutContentError} from "../errors/message-without-content.error";
import {Config} from "../model/config";
import admin = require('firebase-admin');
import WriteResult = firestore.WriteResult;
import DocumentData = firebase.firestore.DocumentData;

export class PersistenceController {
    private app = firebase.initializeApp(firebaseConfig);
    private db: firestore.Firestore;
    private client: rm.RestClient;

    private KEYS = {
        USERS: {
            key: 'users',
            name: 'name',
            universityId: 'universityId',
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

    constructor(private config: Config) {
        const serviceAccount = require('../service-account.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        this.db = admin.firestore();
        this.client = new rm.RestClient('discord-bot');
    }

    putRegisteredStudent(discordId: string, universityId: string): Observable<any> {
        const docRef = this.db.collection(this.KEYS.USERS.key).doc(universityId);
        return fromPromise(docRef.set({
            [this.KEYS.USERS.discordId]: discordId,
            [this.KEYS.USERS.universityId]: universityId,
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

    addMultipleParticipationForDiscordId = (qty: number, discordId: string, date: string): Observable<any> => {
        if(qty === 0) {
            return of(true);
        }
        return defer(() => this.addParticipationForDiscordId(discordId, date)).pipe(delay(10), repeat(qty), bufferCount(qty))
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

    createNewActivity(name: string, date: string, resources: Resource[], optional: boolean = false): Observable<Activity> {
        const activityDocRef = this.db.collection(this.KEYS.ACTIVITIES.key).doc(date);
        const activityObj: Activity = {
            name: name,
            date: date,
            optional: optional,
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

    getAllPreviousSessions(): Observable<Session[]> {
        const filterSessionsUntilToday = (sessions: Session[]): Session[] => {
            const today = Date.now();
            return sessions.filter(session => Date.parse(session.date) <= today);
        }

        const sessionDocRef = this.db.collection(this.KEYS.SESSIONS.key);
        return fromPromise(sessionDocRef.get()).pipe(
            map(snapshot => snapshot.docs.map(doc => doc.data() as Session)),
            map(sessions => filterSessionsUntilToday(sessions)));
    }

    getAllActivities(): Observable<Activity[]> {
        const sessionDocRef = this.db.collection(this.KEYS.ACTIVITIES.key);
        return fromPromise(sessionDocRef.get()).pipe(map(snapshot => snapshot.docs.map(doc => doc.data() as Activity)));
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

    addGradeToActivity(discordId: string, date: string, grade: string): Observable<any> {
        if (!discordId || !date || !grade) {
            return throwError(new MessageWithoutContentError())
        }
        const addGradeToUserActivity = (universityId: string): Observable<WriteResult> => {
            const userDocRef = this.db.collection(this.KEYS.USERS.key).doc(universityId);
            return fromPromise(userDocRef.update({
                [this.KEYS.USERS.activities_grades]: admin.firestore.FieldValue.arrayUnion({
                    activity: date,
                    grade: grade.toString()
                })
            }));
        }
        return this.getUniversityIdFromDiscordId(discordId).pipe(
            switchMap(universityId => addGradeToUserActivity(universityId))
        );
    }

    addExamGradeToUser(discordId: string, partialName: string, grade: string): Observable<any> {
        if (!discordId || !partialName || !grade) {
            return throwError(new MessageWithoutContentError())
        }
        const addExamGradeToUser = (universityId: string): Observable<WriteResult> => {
            const userDocRef = this.db.collection(this.KEYS.USERS.key).doc(universityId);
            return fromPromise(userDocRef.update({
                [this.KEYS.USERS.exams_grades]: admin.firestore.FieldValue.arrayUnion({
                    partialName: partialName,
                    grade: grade.toString()
                })
            }));
        }
        return this.getUniversityIdFromDiscordId(discordId).pipe(
            switchMap(universityId => addExamGradeToUser(universityId))
        );
    }

    getAllUsers(): Observable<Student[]> {
        const userDocRef = this.db.collection(this.KEYS.USERS.key);
        return fromPromise(userDocRef.get()).pipe(
            map(snapshot => snapshot.docs.map(doc => doc.data() as Student)),
            map(users => users.filter(u => u.discordId !== this.config.teacher.discordId))
        );
    }

    getUser(discordId: string): Observable<Student> {
        const docRef = this.db.collection(this.KEYS.USERS.key).where('discordId', '==', discordId);
        return fromPromise(docRef.get()).pipe(
            tap(queryResult => {
                if (queryResult.empty) {
                    throw new NotRegisteredError();
                }
            }),
            map(queryResult => queryResult.docs[0].data() as Student)
        );
    }
}