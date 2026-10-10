# Survey, test cases and user testing (fill in only real results)

## A. Customer interview (5 people) - ask these
Say: "I am a student building a project. Your answers are anonymous."
1. Do you order home-cooked or homely food now? How (phone call, WhatsApp, walk-in)?
2. How often do you eat outside or order food in a week?
3. What is the biggest problem when you order today? (menu not clear, price unknown, no delivery, uncertain availability, hygiene, payment, other)
4. Would you use an app that shows today's menu, portions left and delivery slot? (Yes / Maybe / No) Why?
5. How would you prefer to pay? (UPI / card / cash)
6. What would make you trust a home cook? (ratings, photos, cook name, hygiene info)
7. Which would attract you most: coupon, loyalty points, free delivery, referral?
8. Anything else you want in such an app?

Use a Google Form with these 8 questions and send the link on WhatsApp, or ask in person and note answers.

### Results table (copy answers exactly as given)
| # | Person (age / occupation) | Q3 main problem | Q4 would use? | Q5 payment | Other comments |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |

Summary (write after collecting): ______

## B. Test cases
Automated check = run on 2026-10-09 in headless Chromium with a 390x800 phone screen (done by Claude, desktop emulation). Phone column = YOU fill in after testing on your real phone.

| ID | Feature | Steps | Expected result | Automated result | Real phone result (you fill) |
|---|---|---|---|---|---|
| T1 | Sign-up validation | Tap sign up with empty form | Error messages shown | Pass | |
| T2 | Sign-up | Valid name, 10-digit number, consent | Home screen opens | Pass | |
| T3 | Search | Type "biryani" | Only matching dish shown | Pass | |
| T4 | Search, no result | Type "zzzz" | "No dishes match" message | Pass | |
| T5 | Category filter | Tap Sweets | Only sweets shown | Pass | |
| T6 | Add to cart | Open dish, add, open cart | Items and quantities in cart | Pass | |
| T7 | Invalid coupon | Enter BAD | Error "Invalid coupon code" | Pass | |
| T8 | Valid coupon | Enter WELCOME20 | 20% discount shown in bill | Pass | |
| T9 | Checkout validation | Pay with empty address / bad UPI | Field errors, no order | Pass | |
| T10 | Failed payment | UPI id "fail@upi" | Payment failed message, no order | Pass | |
| T11 | Card validation | Wrong card number | "Card number is not valid" | Pass | |
| T12 | Successful order | Valid test card 4111 1111 1111 1111 | Confirmation screen with order ID | Pass | |
| T13 | Card privacy | Check browser storage after payment | Card number not stored | Pass | |
| T14 | Order tracking | Open Track | Status moves automatically | Pass | |
| T15 | Admin dashboard | Profile > Admin, PIN 1234 | Sales, top dishes, order list | Pass | |
| T16 | Rating | Delivered order > Rate > 4 stars | Feedback saved, points added | Pass | |
| T17 | Reorder | Orders > Reorder | Items back in cart | Pass | |
| T18 | Coupon rule | Reuse WELCOME20 after 1st order | Rejected: first order only | Pass | |
| T19 | FAQ chatbot | Profile > Help & FAQ | Question and answer bubbles | Pass | |
| T20 | Data persistence | Reload page | Still logged in, data kept | Pass | |
| T21 | Live URL on phone | Open deployed link on phone | App loads | Not tested yet | |
| T22 | QR code | Scan with phone camera | Opens live app | Not tested yet | |

## C. User testing with 3 real people (you do this)
1. Send the live link or QR to 3 people (friends/family who would eat home food).
2. Give them tasks: sign up, find a vegetarian dish, add 2 items, apply a coupon, pay with the test card, track, rate.
3. Watch without helping. Note where they hesitate.
4. Ask: What was confusing? What did you like? What would you add? Rate ease of use 1-5.

| User | Task problems observed | Their feedback (their words) | Ease 1-5 | Improvement I made |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

Make at least one real change based on feedback (tell me and I will update the code) and write it in the last column.
