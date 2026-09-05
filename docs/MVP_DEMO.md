# MVP Demo Script

Use two browser profiles or one normal and one private window. Use fictional
career and job data. The demo is strongest when Member B works at the company in
the shared job, so the referral and attribution paths are visible.

## Preparation

- Apply migrations and confirm `/api/health` is healthy.
- Confirm Google, OpenAI, and Ably integrations are available.
- Have a real public job URL plus enough pasted listing text for extraction.
- Prepare two test identities: Group Owner A and Member B.

## 1. Create An Account

Open `/sign-up` as Owner A. Create an account with email/password or Google and
show that authentication leads into the app rather than a generic landing page.

## 2. Create A Jobs & Referrals Group

Choose **Create group**, name the group, and create it. Point out that Jobs &
Referrals is the only engine and immediately provides For You, Jobs, Tracker,
People, and Chat.

## 3. Invite A Member

Open **Invite people**, create a time-limited link, and copy it. Open the link as
Member B in the second browser profile, create/sign into an account, and join.

## 4. Complete Career Profiles

As Owner A, add desired roles, location, experience, and skills once. Show the
privacy controls. Give Member B a visible current company matching the job used
in the demo so they can appear as a potential referrer.

## 5. Share A Job

As Member B, choose **Share job**, provide the public URL and pasted listing
text, then review the extracted draft before sharing. Explain that Brain treats
the listing as untrusted data and the user confirms the record.

## 6. See The Structured Job Card

Open **Jobs** and show company, title, location/work mode, skills, sharer context,
and actions as a structured object rather than a message buried in chat.

## 7. View The For You Match

Return to Owner A and open **For You**. Show the match strength and explanation
derived from Owner A's private preferences without exposing those preferences to
Member B.

## 8. Save And Apply

Save the job, open the Saved filter, then choose **Mark applied**. Show that the
job enters Owner A's private Tracker and does not appear in Member B's tracker.

## 9. Request A Referral

From the job, choose **Request referral** and select Member B. As Member B,
accept the request and move it to Referred. Show the explicit workflow history.

## 10. Ask This Group

As Owner A, open **Ask this Group** and ask: "Which role matches my profile and
who may be able to refer me?" Show the answer and linked citations. Explain that
retrieval is restricted to this group plus Owner A's request-local saved state.

## 11. Track The Application

In **Tracker**, advance the application to Interviewing and add a private next
action or note. Record the interview milestone. Emphasize that group admins do
not automatically receive private tracker access.

## 12. Share An Outcome With Consent

Open the outcome review. Confirm that the displayed sharer/referrer attribution
is correct, actively select the consent checkbox, and share the outcome with the
group. Show the shared outcome and contribution credit, then explain that the
owner can withdraw sharing later.

## Closing Message

The demonstrated loop is purpose-native: a conversation-worthy job becomes a
structured object, personalized action, a referral workflow, a private tracker,
and a consented outcome. No automatic application is performed.
