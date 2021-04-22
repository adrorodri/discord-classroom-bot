export class QuizError extends Error {
    message = 'Quiz error!';

    constructor(detailsMessage: string) {
        super();
        this.message += ' ' + detailsMessage;
    }
}