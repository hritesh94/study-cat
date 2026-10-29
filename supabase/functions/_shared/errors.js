// Every way an AI request can go wrong, as a short code. The app turns each
// code into something cute the cat says (src/ai/client.js).
//
//   unauthorized  not logged in (or the login expired)
//   bad_input     the request doesn't make sense
//   too_big       text or image over the limits in config.js
//   limit         this user's AI calls for today are used up
//   tired         the AI is rate-limited for everyone (free tier); try in a minute
//   ai_down       the AI (or its key) isn't working
//   bad_output    the AI answered something we couldn't use
//   not_found     e.g. the goal doesn't exist (or isn't yours)
export class AiError extends Error {
  constructor(code, message, extra) {
    super(message ?? code)
    this.code = code
    this.extra = extra // sent to the app too, e.g. { used, limit }
  }
}

export const STATUS = {
  unauthorized: 401,
  bad_input: 400,
  not_found: 404,
  too_big: 413,
  limit: 429,
  tired: 503,
  ai_down: 502,
  bad_output: 502,
}
