import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

/**
 * Normalizes text and generates a SHA-256 hash.
 * Embedded directly to avoid relative path resolution issues during seeding.
 */
function generateSemanticHash(text: string): string {
  const normalizedText = text.toLowerCase().replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(normalizedText).digest('hex');
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding bulk questions...');

  const questionData = [
    {
      "pattern": {
        "exam_type": "SSC",
        "branch": "Quantitative Aptitude",
        "topic_name": "Time and Work"
      },
      "questions": [
        {
          "question_text": "A can do a piece of work in 10 days and B can do the same work in 15 days. In how many days can they complete the work if they work together?",
          "question_text_hindi": "A किसी कार्य को 10 दिनों में कर सकता है और B उसी कार्य को 15 दिनों में कर सकता है। यदि वे दोनों मिलकर कार्य करें, तो वे इसे कितने दिनों में पूरा करेंगे?",
          "options": ["A. 5 days", "B. 6 days", "C. 8 days", "D. 12.5 days"],
          "options_hindi": ["A. 5 दिन", "B. 6 दिन", "C. 8 दिन", "D. 12.5 दिन"],
          "correct_answer": "B",
          "explanation": "Total work = LCM(10, 15) = 30 units. A's efficiency = 3 units/day, B's efficiency = 2 units/day. Combined efficiency = 5 units/day. Time = 30 / 5 = 6 days.",
          "explanation_hindi": "कुल कार्य = LCM(10, 15) = 30 यूनिट। A की क्षमता = 3 यूनिट/दिन, B की क्षमता = 2 यूनिट/दिन। संयुक्त क्षमता = 5 यूनिट/दिन। समय = 30 / 5 = 6 दिन।",
          "marks": "2",
          "difficulty_level": "Easy"
        },
        {
          "question_text": "A and B together can do a piece of work in 8 days. If A alone can do it in 12 days, in how many days can B alone complete the work?",
          "question_text_hindi": "A और B मिलकर एक कार्य को 8 दिनों में कर सकते हैं। यदि A अकेला इसे 12 दिनों में कर सकता है, तो B अकेला उस कार्य को कितने दिनों में पूरा कर सकता है?",
          "options": ["A. 16 days", "B. 20 days", "C. 24 days", "D. 30 days"],
          "options_hindi": ["A. 16 दिन", "B. 20 दिन", "C. 24 दिन", "D. 30 दिन"],
          "correct_answer": "C",
          "explanation": "Total work = LCM(8, 12) = 24 units. A+B efficiency = 3 units/day. A's efficiency = 2 units/day. B's efficiency = 3 - 2 = 1 unit/day. B's time = 24 / 1 = 24 days.",
          "explanation_hindi": "कुल कार्य = LCM(8, 12) = 24 यूनिट। A+B की क्षमता = 3 यूनिट/दिन। A की क्षमता = 2 यूनिट/दिन। B की क्षमता = 3 - 2 = 1 यूनिट/दिन। B का समय = 24 / 1 = 24 दिन।",
          "marks": "2",
          "difficulty_level": "Easy"
        },
        {
          "question_text": "A can do a work in 20 days and B in 30 days. They start working together, but A leaves after 5 days. In how many days will B finish the remaining work?",
          "question_text_hindi": "A एक कार्य को 20 दिनों में और B 30 दिनों में कर सकता है। वे एक साथ कार्य करना शुरू करते हैं, लेकिन A 5 दिनों के बाद छोड़ देता है। B शेष कार्य को कितने दिनों में पूरा करेगा?",
          "options": ["A. 10 days", "B. 15 days", "C. 17.5 days", "D. 22.5 days"],
          "options_hindi": ["A. 10 दिन", "B. 15 दिन", "C. 17.5 दिन", "D. 22.5 दिन"],
          "correct_answer": "C",
          "explanation": "Total work = 60. Efficiency: A=3, B=2. Work done in 5 days = 5 * (3+2) = 25 units. Remaining work = 60 - 25 = 35 units. B's time = 35 / 2 = 17.5 days.",
          "explanation_hindi": "कुल कार्य = 60। क्षमता: A=3, B=2। 5 दिनों में किया गया कार्य = 5 * (3+2) = 25 यूनिट। शेष कार्य = 60 - 25 = 35 यूनिट। B का समय = 35 / 2 = 17.5 दिन।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "A is twice as good a workman as B. Together they can finish a work in 14 days. In how many days can A alone finish the work?",
          "question_text_hindi": "A, B की तुलना में दोगुना कुशल है। वे दोनों मिलकर किसी कार्य को 14 दिनों में पूरा कर सकते हैं। अकेले A उस कार्य को कितने दिनों में पूरा करेगा?",
          "options": ["A. 21 days", "B. 28 days", "C. 42 days", "D. 10.5 days"],
          "options_hindi": ["A. 21 दिन", "B. 28 दिन", "C. 42 दिन", "D. 10.5 दिन"],
          "correct_answer": "A",
          "explanation": "Efficiency ratio A:B = 2:1. Total efficiency = 3. Total work = 14 * 3 = 42 units. A's time = 42 / 2 = 21 days.",
          "explanation_hindi": "क्षमता का अनुपात A:B = 2:1। कुल क्षमता = 3। कुल कार्य = 14 * 3 = 42 यूनिट। A का समय = 42 / 2 = 21 दिन।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "A, B, and C can complete a piece of work in 10, 12, and 15 days respectively. If they work together, in how many days will the work be completed?",
          "question_text_hindi": "A, B और C एक कार्य को क्रमशः 10, 12 और 15 दिनों में पूरा कर सकते हैं। यदि वे एक साथ कार्य करते हैं, तो कार्य कितने दिनों में पूरा होगा?",
          "options": ["A. 3 days", "B. 4 days", "C. 5 days", "D. 6 days"],
          "options_hindi": ["A. 3 दिन", "B. 4 दिन", "C. 5 दिन", "D. 6 दिन"],
          "correct_answer": "B",
          "explanation": "Total work = LCM(10, 12, 15) = 60 units. Efficiencies: A=6, B=5, C=4. Total efficiency = 15. Time = 60 / 15 = 4 days.",
          "explanation_hindi": "कुल कार्य = LCM(10, 12, 15) = 60 यूनिट। क्षमताएं: A=6, B=5, C=4। कुल क्षमता = 15। समय = 60 / 15 = 4 दिन।",
          "marks": "2",
          "difficulty_level": "Easy"
        },
        {
          "question_text": "A can finish a work in 18 days and B can do the same work in 24 days. They worked together for 8 days and then B left. In how many days can A finish the remaining work?",
          "question_text_hindi": "A एक कार्य को 18 दिनों में और B उसी कार्य को 24 दिनों में पूरा कर सकता है। उन्होंने 8 दिनों तक साथ कार्य किया और फिर B ने छोड़ दिया। A शेष कार्य को कितने दिनों में पूरा कर सकता है?",
          "options": ["A. 4 days", "B. 5 days", "C. 6 days", "D. 8 days"],
          "options_hindi": ["A. 4 दिन", "B. 5 दिन", "C. 6 दिन", "D. 8 दिन"],
          "correct_answer": "A",
          "explanation": "Total work = 72 units. A's eff = 4, B's eff = 3. Work in 8 days = 8*(4+3) = 56. Remaining = 72 - 56 = 16. A's time = 16 / 4 = 4 days.",
          "explanation_hindi": "कुल कार्य = 72 यूनिट। A की क्षमता = 4, B की क्षमता = 3। 8 दिनों में कार्य = 8*(4+3) = 56। शेष = 72 - 56 = 16। A का समय = 16 / 4 = 4 दिन।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "A and B working separately can do a piece of work in 10 and 15 days respectively. If they work on alternate days beginning with A, in how many days will the work be completed?",
          "question_text_hindi": "A और B अलग-अलग कार्य करते हुए क्रमशः 10 और 15 दिनों में एक कार्य कर सकते हैं। यदि वे A से शुरू करते हुए बारी-बारी से कार्य करते हैं, तो कार्य कितने दिनों में पूरा होगा?",
          "options": ["A. 12 days", "B. 13 days", "C. 10.5 days", "D. 14 days"],
          "options_hindi": ["A. 12 दिन", "B. 13 दिन", "C. 10.5 दिन", "D. 14 दिन"],
          "correct_answer": "A",
          "explanation": "Work = 30. A=3, B=2. 2 days cycle work = 5 units. 30/5 = 6 cycles. 6 * 2 = 12 days.",
          "explanation_hindi": "कार्य = 30। A=3, B=2। 2 दिनों के चक्र का कार्य = 5 यूनिट। 30/5 = 6 चक्र। 6 * 2 = 12 दिन।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "10 men can complete a work in 15 days. How many days will 15 men take to complete the same work?",
          "question_text_hindi": "10 पुरुष एक कार्य को 15 दिनों में पूरा कर सकते हैं। 15 पुरुष उसी कार्य को पूरा करने में कितने दिन लेंगे?",
          "options": ["A. 8 days", "B. 10 days", "C. 12 days", "D. 20 days"],
          "options_hindi": ["A. 8 दिन", "B. 10 दिन", "C. 12 दिन", "D. 20 दिन"],
          "correct_answer": "B",
          "explanation": "Using M1*D1 = M2*D2. 10 * 15 = 15 * D2. D2 = 10 days.",
          "explanation_hindi": "M1*D1 = M2*D2 का उपयोग करने पर। 10 * 15 = 15 * D2। D2 = 10 दिन।",
          "marks": "2",
          "difficulty_level": "Easy"
        },
        {
          "question_text": "40 men can complete a work in 15 days working 8 hours a day. In how many days can 60 men complete it working 10 hours a day?",
          "question_text_hindi": "40 पुरुष प्रतिदिन 8 घंटे कार्य करके एक कार्य को 15 दिनों में पूरा कर सकते हैं। 10 घंटे प्रतिदिन कार्य करके 60 पुरुष इसे कितने दिनों में पूरा कर सकते हैं?",
          "options": ["A. 6 days", "B. 8 days", "C. 10 days", "D. 12 days"],
          "options_hindi": ["A. 6 दिन", "B. 8 दिन", "C. 10 दिन", "D. 12 दिन"],
          "correct_answer": "B",
          "explanation": "M1*D1*H1 = M2*D2*H2. 40 * 15 * 8 = 60 * D2 * 10. 4800 = 600 * D2. D2 = 8 days.",
          "explanation_hindi": "M1*D1*H1 = M2*D2*H2। 40 * 15 * 8 = 60 * D2 * 10। 4800 = 600 * D2। D2 = 8 दिन।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "If 3 men or 4 women can plough a field in 43 days, how long will 7 men and 5 women take to plough it?",
          "question_text_hindi": "यदि 3 पुरुष या 4 महिलाएं एक खेत को 43 दिनों में जोत सकते हैं, तो 7 पुरुष और 5 महिलाएं इसे जोतने में कितना समय लेंगे?",
          "options": ["A. 10 days", "B. 11 days", "C. 12 days", "D. 15 days"],
          "options_hindi": ["A. 10 दिन", "B. 11 दिन", "C. 12 दिन", "D. 15 दिन"],
          "correct_answer": "C",
          "explanation": "3M = 4W => 1M = 4/3W. (7M + 5W) = (28/3 W + 5W) = 43/3 W. M1*D1 = M2*D2 => 4W * 43 = (43/3)W * D2. D2 = 12 days.",
          "explanation_hindi": "3M = 4W => 1M = 4/3W। (7M + 5W) = (28/3 W + 5W) = 43/3 W। 4W * 43 = (43/3)W * D2। D2 = 12 दिन।",
          "marks": "2",
          "difficulty_level": "Hard"
        },
        {
          "question_text": "A, B and C undertake to do a piece of work for Rs. 5000. A and B together do 3/5 of the work. What is C's share?",
          "question_text_hindi": "A, B और C 5000 रुपये में एक कार्य करने का जिम्मा लेते हैं। A और B मिलकर कार्य का 3/5 भाग करते हैं। C का हिस्सा क्या है?",
          "options": ["A. Rs. 1000", "B. Rs. 2000", "C. Rs. 3000", "D. Rs. 1500"],
          "options_hindi": ["A. Rs. 1000", "B. Rs. 2000", "C. Rs. 3000", "D. Rs. 1500"],
          "correct_answer": "B",
          "explanation": "C does 1 - 3/5 = 2/5 of the work. Share of C = 2/5 of 5000 = Rs. 2000.",
          "explanation_hindi": "C कार्य का 1 - 3/5 = 2/5 भाग करता है। C का हिस्सा = 5000 का 2/5 = 2000 रुपये।",
          "marks": "2",
          "difficulty_level": "Easy"
        },
        {
          "question_text": "A can do 1/3 of a work in 5 days and B can do 2/5 of the work in 10 days. In how many days can both A and B together do the work?",
          "question_text_hindi": "A किसी कार्य का 1/3 भाग 5 दिनों में और B उसी कार्य का 2/5 भाग 10 दिनों में कर सकता है। A और B दोनों मिलकर उस कार्य को कितने दिनों में पूरा कर सकते हैं?",
          "options": ["A. 7.5 days", "B. 9.375 days", "C. 10 days", "D. 12 days"],
          "options_hindi": ["A. 7.5 दिन", "B. 9.375 दिन", "C. 10 दिन", "D. 12 दिन"],
          "correct_answer": "B",
          "explanation": "A takes 5*3 = 15 days. B takes 10*5/2 = 25 days. Total work = 75. A=5, B=3. Together = 75/8 = 9.375 days.",
          "explanation_hindi": "A को 15 दिन लगते हैं। B को 25 दिन लगते हैं। कुल कार्य = 75। A=5, B=3। साथ में = 75/8 = 9.375 दिन।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "A takes 3 times as long as B and C together to do a job. B takes 4 times as long as A and C together. If all three working together can complete the job in 24 days, in how many days can A alone do it?",
          "question_text_hindi": "A को किसी कार्य को करने में B और C द्वारा मिलकर लिए गए समय से 3 गुना समय लगता है। B को A और C द्वारा मिलकर लिए गए समय से 4 गुना समय लगता है। यदि तीनों मिलकर 24 दिनों में कार्य पूरा करते हैं, तो A अकेला इसे कितने दिनों में करेगा?",
          "options": ["A. 90 days", "B. 96 days", "C. 120 days", "D. 100 days"],
          "options_hindi": ["A. 90 दिन", "B. 96 दिन", "C. 120 दिन", "D. 100 दिन"],
          "correct_answer": "B",
          "explanation": "Time ratio A:(B+C) = 3:1 => Efficiency A:(B+C) = 1:3. A's eff is 1/4 of total. Total work = 24 * 4 = 96 units. A takes 96/1 = 96 days.",
          "explanation_hindi": "समय का अनुपात A:(B+C) = 3:1 => क्षमता A:(B+C) = 1:3। A की क्षमता कुल का 1/4 है। कुल कार्य = 24 * 4 = 96 यूनिट। A को 96 दिन लगेंगे।",
          "marks": "2",
          "difficulty_level": "Hard"
        },
        {
          "question_text": "A and B can do a piece of work in 30 days. They worked on it for 20 days and then B left. The remaining work was done by A alone in 20 more days. In how many days can A alone finish the whole work?",
          "question_text_hindi": "A और B किसी कार्य को 30 दिनों में कर सकते हैं। उन्होंने 20 दिनों तक कार्य किया और फिर B ने छोड़ दिया। शेष कार्य A द्वारा अकेले 20 और दिनों में किया गया। A अकेला पूरा कार्य कितने दिनों में कर सकता है?",
          "options": ["A. 40 days", "B. 50 days", "C. 60 days", "D. 75 days"],
          "options_hindi": ["A. 40 दिन", "B. 50 दिन", "C. 60 दिन", "D. 75 दिन"],
          "correct_answer": "C",
          "explanation": "Work done in 20 days = 20/30 = 2/3. Remaining 1/3 work is done by A in 20 days. Whole work by A = 20 * 3 = 60 days.",
          "explanation_hindi": "20 दिनों में किया गया कार्य = 20/30 = 2/3। शेष 1/3 कार्य A द्वारा 20 दिनों में किया जाता है। A द्वारा पूरा कार्य = 20 * 3 = 60 दिन।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "Efficiency of A is 40% more than that of B. If B alone can complete a work in 14 days, then A alone will complete the same work in?",
          "question_text_hindi": "A की क्षमता B से 40% अधिक है। यदि B अकेला किसी कार्य को 14 दिनों में पूरा कर सकता है, तो A अकेला उसी कार्य को कितने दिनों में पूरा करेगा?",
          "options": ["A. 10 days", "B. 12 days", "C. 14 days", "D. 16 days"],
          "options_hindi": ["A. 10 दिन", "B. 12 दिन", "C. 14 दिन", "D. 16 दिन"],
          "correct_answer": "A",
          "explanation": "Efficiency ratio A:B = 140:100 = 7:5. Time ratio = 5:7. Since 7 parts = 14 days, 5 parts = 10 days.",
          "explanation_hindi": "क्षमता का अनुपात A:B = 7:5। समय का अनुपात = 5:7। चूंकि 7 हिस्सा = 14 दिन, 5 हिस्सा = 10 दिन।",
          "marks": "2",
          "difficulty_level": "Easy"
        },
        {
          "question_text": "2 men and 3 boys can do a piece of work in 10 days, while 3 men and 2 boys can do the same work in 8 days. In how many days can 2 men and 1 boy do the work?",
          "question_text_hindi": "2 पुरुष और 3 लड़के किसी कार्य को 10 दिनों में कर सकते हैं, जबकि 3 पुरुष और 2 लड़के उसी कार्य को 8 दिनों में कर सकते हैं। 2 पुरुष और 1 लड़का उस कार्य को कितने दिनों में कर सकते हैं?",
          "options": ["A. 12 days", "B. 12.5 days", "C. 14 days", "D. 15 days"],
          "options_hindi": ["A. 12 दिन", "B. 12.5 दिन", "C. 14 दिन", "D. 15 दिन"],
          "correct_answer": "B",
          "explanation": "10(2M + 3B) = 8(3M + 2B) => 2M = 7B. Total work in terms of B = 10(7B + 3B) = 100B. 2M + 1B = 7B + 1B = 8B. Time = 100 / 8 = 12.5 days.",
          "explanation_hindi": "10(2M + 3B) = 8(3M + 2B) से 2M = 7B। कुल कार्य (B के रूप में) = 100B। 2M + 1B = 8B। समय = 100 / 8 = 12.5 दिन।",
          "marks": "2",
          "difficulty_level": "Hard"
        },
        {
          "question_text": "A works twice as fast as B. If both of them together can finish a work in 12 days, B alone can do it in:",
          "question_text_hindi": "A, B से दोगुना तेजी से कार्य करता है। यदि वे दोनों मिलकर 12 दिनों में कार्य पूरा करते हैं, तो B अकेला इसे कितने दिनों में करेगा?",
          "options": ["A. 24 days", "B. 36 days", "C. 18 days", "D. 30 days"],
          "options_hindi": ["A. 24 दिन", "B. 36 दिन", "C. 18 दिन", "D. 30 दिन"],
          "correct_answer": "B",
          "explanation": "Efficiency A:B = 2:1. Together = 3. Total work = 12 * 3 = 36. B alone = 36 / 1 = 36 days.",
          "explanation_hindi": "क्षमता A:B = 2:1। साथ में = 3। कुल कार्य = 12 * 3 = 36। B अकेला = 36 दिन।",
          "marks": "2",
          "difficulty_level": "Easy"
        },
        {
          "question_text": "P, Q and R can complete a work in 10, 12 and 15 days respectively. They started together. P left 2 days before completion and Q left 3 days before completion. How many days was the work completed?",
          "question_text_hindi": "P, Q और R एक कार्य क्रमशः 10, 12 और 15 दिनों में कर सकते हैं। उन्होंने साथ शुरू किया। P कार्य पूरा होने से 2 दिन पहले और Q 3 दिन पहले छोड़ देता है। कार्य कितने दिनों में पूरा हुआ?",
          "options": ["A. 5.8 days", "B. 6 days", "C. 7 days", "D. 8 days"],
          "options_hindi": ["A. 5.8 दिन", "B. 6 दिन", "C. 7 दिन", "D. 8 दिन"],
          "correct_answer": "A",
          "explanation": "Work=60. P=6, Q=5, R=4. 6(x-2) + 5(x-3) + 4x = 60 => 15x = 87 => x = 5.8 days.",
          "explanation_hindi": "कुल कार्य=60। P=6, Q=5, R=4। 6(x-2) + 5(x-3) + 4x = 60 से x = 5.8 दिन।",
          "marks": "2",
          "difficulty_level": "Hard"
        },
        {
          "question_text": "A takes 5 days more than B to complete a job. Together they finish it in 6 days. How many days will A alone take?",
          "question_text_hindi": "A को किसी कार्य को करने में B से 5 दिन अधिक लगते हैं। साथ मिलकर वे इसे 6 दिनों में पूरा करते हैं। A अकेला इसे कितने दिनों में करेगा?",
          "options": ["A. 10 days", "B. 12 days", "C. 15 days", "D. 20 days"],
          "options_hindi": ["A. 10 दिन", "B. 12 दिन", "C. 15 दिन", "D. 20 दिन"],
          "correct_answer": "C",
          "explanation": "Let A=15, B=10. 1/15 + 1/10 = 5/30 = 1/6. Matches 6 days condition.",
          "explanation_hindi": "माना A=15, B=10। 1/15 + 1/10 = 1/6। यह 6 दिनों की शर्त को पूरा करता है।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "A is thrice as efficient as B and hence takes 20 days less than B. In how many days can they complete the work together?",
          "question_text_hindi": "A, B से तीन गुना कुशल है और इसलिए B से 20 दिन कम समय लेता है। वे मिलकर कार्य कितने दिनों में पूरा करेंगे?",
          "options": ["A. 7.5 days", "B. 10 days", "C. 12 days", "D. 15 days"],
          "options_hindi": ["A. 7.5 दिन", "B. 10 दिन", "C. 12 दिन", "D. 15 दिन"],
          "correct_answer": "A",
          "explanation": "Eff A:B = 3:1. Time A:B = 1:3. Diff 2 units = 20 days. A=10, B=30. Together = (10*30)/40 = 7.5 days.",
          "explanation_hindi": "क्षमता A:B = 3:1। समय A:B = 1:3। अंतर 2 यूनिट = 20 दिन। A=10, B=30। साथ में = 7.5 दिन।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "A and B can do a work in 12 days, B and C in 15 days, and C and A in 20 days. In how many days can A, B, and C together complete it?",
          "question_text_hindi": "A और B 12 दिनों में, B और C 15 दिनों में, और C और A 20 दिनों में कार्य कर सकते हैं। A, B, और C मिलकर इसे कितने दिनों में पूरा करेंगे?",
          "options": ["A. 10 days", "B. 12 days", "C. 8 days", "D. 15 days"],
          "options_hindi": ["A. 10 दिन", "B. 12 दिन", "C. 8 दिन", "D. 15 दिन"],
          "correct_answer": "A",
          "explanation": "2(A+B+C) = 1/12 + 1/15 + 1/20 = 1/5. A+B+C = 1/10 => 10 days.",
          "explanation_hindi": "2(A+B+C) = 1/12 + 1/15 + 1/20 = 1/5। A+B+C = 1/10 मतलब 10 दिन।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "In the same condition (A+B=12, B+C=15, C+A=20), in how many days can A alone complete the work?",
          "question_text_hindi": "उसी स्थिति में (A+B=12, B+C=15, C+A=20), A अकेला कार्य कितने दिनों में पूरा कर सकता है?",
          "options": ["A. 20 days", "B. 30 days", "C. 40 days", "D. 60 days"],
          "options_hindi": ["A. 20 दिन", "B. 30 दिन", "C. 40 दिन", "D. 60 दिन"],
          "correct_answer": "B",
          "explanation": "A = (A+B+C) - (B+C) = 1/10 - 1/15 = 1/30 => 30 days.",
          "explanation_hindi": "A = (A+B+C) - (B+C) = 1/10 - 1/15 = 1/30। तो 30 दिन।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "12 men or 18 women can reap a field in 14 days. Find the days that 8 men and 16 women will take.",
          "question_text_hindi": "12 पुरुष या 18 महिलाएं 14 दिनों में एक खेत की कटाई कर सकते हैं। 8 पुरुष और 16 महिलाएं इसे कितने दिनों में करेंगे?",
          "options": ["A. 5 days", "B. 7 days", "C. 9 days", "D. 12 days"],
          "options_hindi": ["A. 5 दिन", "B. 7 दिन", "C. 9 दिन", "D. 12 दिन"],
          "correct_answer": "C",
          "explanation": "12M=18W => 1M=1.5W. 8M+16W = 12W+16W = 28W. 18W * 14 = 28W * D2 => D2 = 9 days.",
          "explanation_hindi": "12M=18W => 1M=1.5W। 8M+16W = 28W। 18W * 14 = 28W * D2 से D2 = 9 दिन।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "A contractor undertook to finish a work in 100 days with 100 men. After 40 days, only 1/4 work was done. Extra men needed to finish on time?",
          "question_text_hindi": "एक ठेकेदार ने 100 पुरुषों के साथ 100 दिनों में कार्य पूरा करने का संकल्प लिया। 40 दिनों के बाद, केवल 1/4 कार्य हुआ। समय पर पूरा करने के लिए कितने अतिरिक्त पुरुषों की आवश्यकता है?",
          "options": ["A. 50", "B. 100", "C. 150", "D. 200"],
          "options_hindi": ["A. 50", "B. 100", "C. 150", "D. 200"],
          "correct_answer": "B",
          "explanation": "(100*40)/(1/4) = (x*60)/(3/4) => x = 200. Extra = 200 - 100 = 100.",
          "explanation_hindi": "(100*40)/(1/4) = (x*60)/(3/4) से x = 200। अतिरिक्त = 200 - 100 = 100।",
          "marks": "2",
          "difficulty_level": "Hard"
        },
        {
          "question_text": "Twenty women can do a work in 16 days. Sixteen men can complete it in 15 days. Ratio of capacity of man to woman?",
          "question_text_hindi": "बीस महिलाएं एक कार्य को 16 दिनों में कर सकती हैं। सोलह पुरुष इसे 15 दिनों में कर सकते हैं। पुरुष और महिला की क्षमता का अनुपात?",
          "options": ["A. 3:4", "B. 4:3", "C. 5:3", "D. 3:5"],
          "options_hindi": ["A. 3:4", "B. 4:3", "C. 5:3", "D. 3:5"],
          "correct_answer": "B",
          "explanation": "20W * 16 = 16M * 15 => 320W = 240M => M/W = 4/3.",
          "explanation_hindi": "20W * 16 = 16M * 15 से M/W = 4/3।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "A can do a work in the same time as B and C together. A+B take 10 days, C takes 50 days. B alone could do it in?",
          "question_text_hindi": "A किसी कार्य को उतने ही समय में कर सकता है जितने में B और C मिलकर। A+B को 10 दिन, C को 50 दिन लगते हैं। B अकेला इसे कितने समय में करेगा?",
          "options": ["A. 15 days", "B. 20 days", "C. 25 days", "D. 30 days"],
          "options_hindi": ["A. 15 दिन", "B. 20 दिन", "C. 25 दिन", "D. 30 दिन"],
          "correct_answer": "C",
          "explanation": "A=B+C. A+B=1/10, C=1/50. Total = 6/50. 2A=6/50 => A=3/50. B=1/10-3/50=2/50=1/25 => 25 days.",
          "explanation_hindi": "A=B+C। A+B=1/10, C=1/50। कुल = 6/50। 2A=6/50 से B=1/25 मतलब 25 दिन।",
          "marks": "2",
          "difficulty_level": "Hard"
        },
        {
          "question_text": "A can do a work in 16 days and B in 12 days. Alternate days starting with A. Total work time?",
          "question_text_hindi": "A 16 दिनों में और B 12 दिनों में कार्य कर सकता है। A से शुरू करते हुए बारी-बारी से कार्य। कुल समय?",
          "options": ["A. 12 days", "B. 13 3/4 days", "C. 13 5/7 days", "D. 14 days"],
          "options_hindi": ["A. 12 दिन", "B. 13 3/4 दिन", "C. 13 5/7 दिन", "D. 14 दिन"],
          "correct_answer": "B",
          "explanation": "Work=48. Cycle(2 days)=7. 6 cycles=42 (12 days). Day 13: A does 3. Day 14: B takes 3/4 day for rem 3 units. Total 13 3/4.",
          "explanation_hindi": "कार्य=48। 2 दिन चक्र=7। 12 दिन=42। 13वें दिन A=3। 14वें दिन B को 3/4 दिन। कुल 13 3/4।",
          "marks": "2",
          "difficulty_level": "Hard"
        },
        {
          "question_text": "A takes 50% more time than B. Together they take 18 days. B alone takes?",
          "question_text_hindi": "A को B से 50% अधिक समय लगता है। साथ में उन्हें 18 दिन लगते हैं। B अकेला कितना समय लेगा?",
          "options": ["A. 30 days", "B. 35 days", "C. 40 days", "D. 45 days"],
          "options_hindi": ["A. 30 दिन", "B. 35 दिन", "C. 40 दिन", "D. 45 दिन"],
          "correct_answer": "A",
          "explanation": "Time A:B = 3:2 => Eff A:B = 2:3. Total work = 18*5 = 90. B = 90/3 = 30 days.",
          "explanation_hindi": "समय A:B = 3:2 => क्षमता A:B = 2:3। कुल कार्य = 18*5 = 90। B = 90/3 = 30 दिन।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "A works 54 days for a job. Worked 9 days then B joined. Remaining finished in 18 days. B alone takes?",
          "question_text_hindi": "A 54 दिनों में कार्य करता है। 9 दिन कार्य किया फिर B शामिल हुआ। शेष 18 दिनों में समाप्त हुआ। B अकेला कितना समय लेगा?",
          "options": ["A. 36 days", "B. 45 days", "C. 54 days", "D. 27 days"],
          "options_hindi": ["A. 36 दिन", "B. 45 दिन", "C. 54 दिन", "D. 27 दिन"],
          "correct_answer": "A",
          "explanation": "A's rem work = 45 days. (A+B) did it in 18. 1/A + 1/B = 1/x. Calculating efficiencies: B takes 36 days.",
          "explanation_hindi": "A का शेष कार्य 45 दिन का था जिसे (A+B) ने 18 में किया। गणना करने पर B को 36 दिन लगते हैं।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "If 5 men or 8 women can do a work in 12 days, 2 men and 4 women take?",
          "question_text_hindi": "यदि 5 पुरुष या 8 महिलाएं 12 दिनों में कार्य कर सकते हैं, तो 2 पुरुष और 4 महिलाएं कितना समय लेंगे?",
          "options": ["A. 13 1/3 days", "B. 15 days", "C. 16 days", "D. 20 days"],
          "options_hindi": ["A. 13 1/3 दिन", "B. 15 दिन", "C. 16 दिन", "D. 20 दिन"],
          "correct_answer": "A",
          "explanation": "5M=8W. 2M+4W = 7.2W. (8*12)/7.2 = 13.33 days.",
          "explanation_hindi": "5M=8W। 2M+4W = 7.2W। (8*12)/7.2 = 13.33 दिन।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "A is 30% more efficient than B. Together they take how many days if A alone takes 23 days?",
          "question_text_hindi": "A, B से 30% अधिक कुशल है। यदि A अकेला 23 दिन लेता है, तो वे मिलकर कितने दिन लेंगे?",
          "options": ["A. 9 days", "B. 11 days", "C. 13 days", "D. 15 days"],
          "options_hindi": ["A. 9 दिन", "B. 11 दिन", "C. 13 दिन", "D. 15 दिन"],
          "correct_answer": "C",
          "explanation": "Eff A=1.3, B=1. Total work = 23*1.3 = 29.9. Together time = 29.9 / 2.3 = 13 days.",
          "explanation_hindi": "क्षमता A=1.3, B=1। कुल कार्य = 29.9। साथ में समय = 13 दिन।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "A, B, C can do work in 20, 24, 30 days. A and B left 4 days before completion. Work finished in?",
          "question_text_hindi": "A, B, C 20, 24, 30 दिनों में कर सकते हैं। A और B अंत से 4 दिन पहले छोड़ देते हैं। कार्य कब समाप्त हुआ?",
          "options": ["A. 10.9 days", "B. 12 days", "C. 14 days", "D. 15 days"],
          "options_hindi": ["A. 10.9 दिन", "B. 12 दिन", "C. 14 दिन", "D. 15 दिन"],
          "correct_answer": "A",
          "explanation": "11x - 44 + 4x = 120 => 15x = 164 => x = 10.93.",
          "explanation_hindi": "11x - 44 + 4x = 120 से x = 10.93 दिन।",
          "marks": "2",
          "difficulty_level": "Hard"
        },
        {
          "question_text": "A takes 10 days less than B. Together they take 12 days. B alone?",
          "question_text_hindi": "A, B से 10 दिन कम लेता है। साथ में उन्हें 12 दिन लगते हैं। B अकेला?",
          "options": ["A. 20 days", "B. 25 days", "C. 30 days", "D. 35 days"],
          "options_hindi": ["A. 20 दिन", "B. 25 दिन", "C. 30 दिन", "D. 35 दिन"],
          "correct_answer": "C",
          "explanation": "1/30 + 1/20 = 1/12. B=30.",
          "explanation_hindi": "1/30 + 1/20 = 1/12। B=30।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "24 men in 16 days. 8 women in 72 days. 24 men and 24 women together?",
          "question_text_hindi": "24 पुरुष 16 दिनों में। 8 महिलाएं 72 दिनों में। 24 पुरुष और 24 महिलाएं मिलकर?",
          "options": ["A. 9.6 days", "B. 10 days", "C. 12 days", "D. 8 days"],
          "options_hindi": ["A. 9.6 दिन", "B. 10 दिन", "C. 12 दिन", "D. 8 दिन"],
          "correct_answer": "A",
          "explanation": "2M=3W. 24M+24W = 40M. (24*16)/40 = 9.6.",
          "explanation_hindi": "2M=3W। 24M+24W = 40M। (24*16)/40 = 9.6।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "A+B=12, B+C=8, C+A=6. How long for B alone?",
          "question_text_hindi": "A+B=12, B+C=8, C+A=6। B अकेले कितना समय लेगा?",
          "options": ["A. 24 days", "B. 32 days", "C. 48 days", "D. 60 days"],
          "options_hindi": ["A. 24 दिन", "B. 32 दिन", "C. 48 दिन", "D. 60 दिन"],
          "correct_answer": "C",
          "explanation": "2(A+B+C) = 1/12+1/8+1/6 = 9/24. A+B+C = 3/16. B = 3/16 - 1/6 = 1/48.",
          "explanation_hindi": "B = 3/16 - 1/6 = 1/48. तो 48 दिन।",
          "marks": "2",
          "difficulty_level": "Hard"
        },
        {
          "question_text": "P prints in 8h, Q in 10h, R in 12h. All start at 9 AM, P stops at 11 AM. Finish time?",
          "question_text_hindi": "P 8घंटे, Q 10घंटे, R 12घंटे में प्रिंट करते हैं। 9 AM पर शुरू, P 11 AM पर बंद। समाप्त होने का समय?",
          "options": ["A. 12 PM", "B. 12:30 PM", "C. 1 PM", "D. 1:30 PM"],
          "options_hindi": ["A. 12 PM", "B. 12:30 PM", "C. 1 PM", "D. 1:30 PM"],
          "correct_answer": "C",
          "explanation": "Remaining work after 2 hours ≈ 23/60. Q+R finish in approx 2 more hours.",
          "explanation_hindi": "2 घंटे बाद शेष कार्य ≈ 23/60। Q+R को लगभग 2 और घंटे लगते हैं।",
          "marks": "2",
          "difficulty_level": "Hard"
        },
        {
          "question_text": "6M+8B in 10 days. 26M+48B in 2 days. 15M+20B in?",
          "question_text_hindi": "6M+8B 10 दिनों में। 26M+48B 2 दिनों में। 15M+20B कितने में?",
          "options": ["A. 4 days", "B. 5 days", "C. 6 days", "D. 7 days"],
          "options_hindi": ["A. 4 दिन", "B. 5 दिन", "C. 6 दिन", "D. 7 दिन"],
          "correct_answer": "A",
          "explanation": "1M=2B. Total work = 200B. 15M+20B = 50B. 200/50 = 4 days.",
          "explanation_hindi": "1M=2B। कुल कार्य = 200B। 50B को 4 दिन लगेंगे।",
          "marks": "2",
          "difficulty_level": "Hard"
        },
        {
          "question_text": "X in 40 days. Works 8 days then Y finishes in 16. Together?",
          "question_text_hindi": "X 40 दिनों में। 8 दिन कार्य किया फिर Y ने 16 में शेष किया। साथ में?",
          "options": ["A. 13 1/3 days", "B. 15 days", "C. 20 days", "D. 25 days"],
          "options_hindi": ["A. 13 1/3 दिन", "B. 15 दिन", "C. 20 दिन", "D. 25 दिन"],
          "correct_answer": "A",
          "explanation": "Y=20 days. Together = (40*20)/60 = 13.33.",
          "explanation_hindi": "Y=20 दिन। साथ में = 13.33 दिन।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "A is 2x B. Together in 18 days. A alone?",
          "question_text_hindi": "A, B से 2 गुना है। साथ में 18 दिन। A अकेला?",
          "options": ["A. 27 days", "B. 54 days", "C. 36 days", "D. 45 days"],
          "options_hindi": ["A. 27 दिन", "B. 54 दिन", "C. 36 दिन", "D. 45 दिन"],
          "correct_answer": "A",
          "explanation": "Total=54. A=54/2=27.",
          "explanation_hindi": "कुल=54। A=27।",
          "marks": "2",
          "difficulty_level": "Easy"
        },
        {
          "question_text": "A+B start together. A leaves, B finishes remaining in 5 days. Total A=10, B=15. A left after?",
          "question_text_hindi": "A+B साथ शुरू। A ने छोड़ा, B ने शेष 5 में किया। A=10, B=15। A ने कब छोड़ा?",
          "options": ["A. 2 days", "B. 3 days", "C. 4 days", "D. 5 days"],
          "options_hindi": ["A. 2 दिन", "B. 3 दिन", "C. 4 दिन", "D. 5 दिन"],
          "correct_answer": "C",
          "explanation": "B's 5 days = 10 units. A+B did 20 units in 4 days.",
          "explanation_hindi": "B के 5 दिन = 10 यूनिट। A+B ने 4 दिनों में 20 यूनिट किए।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "12 carpenters, 6h/day, 460 chairs in 24 days. 18 carpenters, 8h/day, 36 days. How many chairs?",
          "question_text_hindi": "12 बढ़ई, 6घंटे/दिन, 24 दिनों में 460 कुर्सियां। 18 बढ़ई, 8घंटे/दिन, 36 दिनों में कितनी कुर्सियां?",
          "options": ["A. 1260", "B. 1380", "C. 920", "D. 1500"],
          "options_hindi": ["A. 1260", "B. 1380", "C. 920", "D. 1500"],
          "correct_answer": "B",
          "explanation": "Using MDH/W: W2 = 1380.",
          "explanation_hindi": "MDH/W का उपयोग: W2 = 1380।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "6M+5W in 6 days or 3M+4W in 10 days. 9M+15W in?",
          "question_text_hindi": "6M+5W 6 दिनों में या 3M+4W 10 दिनों में। 9M+15W कितने में?",
          "options": ["A. 1 day", "B. 2 days", "C. 3 days", "D. 4 days"],
          "options_hindi": ["A. 1 दिन", "B. 2 दिन", "C. 3 दिन", "D. 4 दिन"],
          "correct_answer": "C",
          "explanation": "3M=5W. Convert all to W. (15W)*6 / 30W = 3 days.",
          "explanation_hindi": "3M=5W। सबको W में बदलें। उत्तर 3 दिन।",
          "marks": "2",
          "difficulty_level": "Hard"
        },
        {
          "question_text": "A, B, C in 15, 20, 30 days. C left after 2 days. Remaining by A+B?",
          "question_text_hindi": "A, B, C 15, 20, 30 दिनों में। C ने 2 दिन बाद छोड़ा। शेष A+B द्वारा?",
          "options": ["A. 4 days", "B. 5 days", "C. 6 days", "D. 7 days"],
          "options_hindi": ["A. 4 दिन", "B. 5 दिन", "C. 6 दिन", "D. 7 दिन"],
          "correct_answer": "C",
          "explanation": "Rem = 42. A+B eff = 7. 42/7 = 6.",
          "explanation_hindi": "शेष = 42। A+B क्षमता = 7। 42/7 = 6।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "A in 10, B in 15. Total Rs. 3000. A's share?",
          "question_text_hindi": "A 10, B 15 में। कुल 3000 रु.। A का हिस्सा?",
          "options": ["A. Rs. 1800", "B. Rs. 1200", "C. Rs. 2000", "D. Rs. 1500"],
          "options_hindi": ["A. Rs. 1800", "B. Rs. 1200", "C. Rs. 2000", "D. Rs. 1500"],
          "correct_answer": "A",
          "explanation": "Ratio 3:2. 3/5 * 3000 = 1800.",
          "explanation_hindi": "अनुपात 3:2। A का हिस्सा = 1800।",
          "marks": "2",
          "difficulty_level": "Easy"
        },
        {
          "question_text": "A is 3x B. B takes 24 days. Together?",
          "question_text_hindi": "A, B से 3 गुना है। B 24 दिन लेता है। साथ में?",
          "options": ["A. 4 days", "B. 6 days", "C. 8 days", "D. 12 days"],
          "options_hindi": ["A. 4 दिन", "B. 6 दिन", "C. 8 दिन", "D. 12 दिन"],
          "correct_answer": "B",
          "explanation": "Work=24. Eff=4. 24/4=6.",
          "explanation_hindi": "कार्य=24। क्षमता=4। 24/4=6।",
          "marks": "2",
          "difficulty_level": "Easy"
        },
        {
          "question_text": "Contract 46 days, 117 men, 8h/day. After 33 days, 4/7 done. Extra men for 9h/day?",
          "question_text_hindi": "46 दिन का ठेका, 117 पुरुष, 8घंटे/दिन। 33 दिन में 4/7 हुआ। 9घंटे/दिन के लिए अतिरिक्त पुरुष?",
          "options": ["A. 81", "B. 80", "C. 82", "D. 85"],
          "options_hindi": ["A. 81", "B. 80", "C. 82", "D. 85"],
          "correct_answer": "A",
          "explanation": "(117*33*8)/(4/7) = (x*13*9)/(3/7) => x=198. Extra = 81.",
          "explanation_hindi": "x=198। अतिरिक्त = 81।",
          "marks": "2",
          "difficulty_level": "Hard"
        },
        {
          "question_text": "4M+6W in 8 days. 3M+7W in 10 days. 10W alone?",
          "question_text_hindi": "4M+6W 8 दिन में। 3M+7W 10 दिन में। 10W अकेले?",
          "options": ["A. 35 days", "B. 40 days", "C. 50 days", "D. 60 days"],
          "options_hindi": ["A. 35 दिन", "B. 40 दिन", "C. 50 दिन", "D. 60 दिन"],
          "correct_answer": "B",
          "explanation": "1M=11W. 50W in 8 days => 10W in 40 days.",
          "explanation_hindi": "1M=11W। 50W 8 दिन में तो 10W 40 दिन में।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "10 persons in 20 days. 20 persons with 2x efficiency in?",
          "question_text_hindi": "10 लोग 20 दिन में। 2x क्षमता वाले 20 लोग कितने में?",
          "options": ["A. 5 days", "B. 10 days", "C. 15 days", "D. 20 days"],
          "options_hindi": ["A. 5 दिन", "B. 10 दिन", "C. 15 दिन", "D. 20 दिन"],
          "correct_answer": "A",
          "explanation": "Work=200. Power=20*2=40. 200/40 = 5.",
          "explanation_hindi": "कार्य=200। शक्ति=40। 200/40 = 5।",
          "marks": "2",
          "difficulty_level": "Medium"
        },
        {
          "question_text": "A is 50% more than B. Together in 12 days. A alone?",
          "question_text_hindi": "A, B से 50% अधिक है। साथ में 12 दिन। A अकेला?",
          "options": ["A. 20 days", "B. 30 days", "C. 18 days", "D. 25 days"],
          "options_hindi": ["A. 20 दिन", "B. 30 दिन", "C. 18 दिन", "D. 25 दिन"],
          "correct_answer": "A",
          "explanation": "Total=60. A=60/3=20.",
          "explanation_hindi": "कुल=60। A=20।",
          "marks": "2",
          "difficulty_level": "Easy"
        },
        {
          "question_text": "Working 7 hours a day, 15 men can do a work in 20 days. 12 men working 10 hours in?",
          "question_text_hindi": "7 घंटे/दिन, 15 पुरुष 20 दिन में। 12 पुरुष 10 घंटे/दिन में?",
          "options": ["A. 15.5 days", "B. 17.5 days", "C. 20 days", "D. 21 days"],
          "options_hindi": ["A. 15.5 दिन", "B. 17.5 दिन", "C. 20 दिन", "D. 21 दिन"],
          "correct_answer": "B",
          "explanation": "15*20*7 = 12*10*D => D = 17.5.",
          "explanation_hindi": "15*20*7 = 12*10*D से D = 17.5।",
          "marks": "2",
          "difficulty_level": "Medium"
        }
      ]
    }
  ];

  for (const item of questionData) {
    // 1. Find the pattern first
    const pattern = await prisma.pattern.findUnique({
      where: {
        pattern_identifier: {
          exam_type: item.pattern.exam_type,
          branch: item.pattern.branch,
          topic_name: item.pattern.topic_name
        }
      }
    });

    if (!pattern) {
      console.warn(`⚠️ Pattern not found for: ${item.pattern.topic_name}. Skipping questions.`);
      continue;
    }

    console.log(`📝 Seeding ${item.questions.length} questions for topic: ${pattern.topic_name}`);

    for (const q of item.questions) {
      // Calculate hash automatically if not provided
      const hash = generateSemanticHash(q.question_text);
      
      await prisma.generatedQuestion.upsert({
        where: { semantic_hash: hash },
        update: {
          question_text: q.question_text,
          question_text_hindi: q.question_text_hindi,
          options: q.options,
          options_hindi: q.options_hindi,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          explanation_hindi: q.explanation_hindi,
          difficulty_level: q.difficulty_level,
          marks: q.marks ? parseInt(q.marks) : 1,
          pattern_id: pattern.id
        },
        create: {
          ...q,
          marks: q.marks ? parseInt(q.marks) : 1,
          semantic_hash: hash,
          pattern_id: pattern.id
        }
      });
    }
  }

  console.log('✨ Question seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding questions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
