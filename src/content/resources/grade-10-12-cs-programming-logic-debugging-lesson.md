---
resource_id: "SC-034"
title: "Programming Logic and Debugging: Finding and Fixing Errors in Code"
grade: "10"
grade_band: "9-12"
subject: "Computer Science & Digital Fluency"
resource_type: "Lesson Plan"
duration: "55 minutes"
standards_framework: "NYS Computer Science and Digital Fluency Learning Standards (2020)"
standards:
  - code: "9-12.CT.4"
    text: "Implement a program using a programming language that includes sequencing, selection, and iteration, and use debugging strategies to identify and fix errors."
    source: "NYS Computer Science and Digital Fluency Learning Standards (2020), Computational Thinking, Grades 9–12 — nysed.gov"
alignment_confidence: "High Confidence"
placement:
  - "General Education"
  - "ICT"
sdi_dimensions:
  - "content"
  - "methodology"
  - "delivery"
mll_support_levels:
  - "Entering/Emerging"
  - "Transitioning/Expanding"
marketplace_title: "Programming Logic Debugging Grades 9-12 CS Lesson — NYS CS 9-12.CT.4"
marketplace_tags:
  - "grade 10"
  - "grade 9-12"
  - "computer science"
  - "programming"
  - "debugging"
  - "9-12.CT.4"
  - "NYS CS standards"
  - "computational thinking"
  - "MLL"
is_sale_ready: true
has_answer_key: true
has_sdi_block: true
has_mll_block: true
human_review: "Automated validation + founder oversight"
created_for: "StandardCraft NYS Resource Library v1.0"
---

## Programming Logic and Debugging: Finding and Fixing Errors in Code
### Grades 9–12 · CS & Digital Fluency · NYS 9-12.CT.4 · 55 Minutes

---

### NYS-Aligned Standard

**9-12.CT.4** — *Implement a program using a programming language that includes sequencing, selection, and iteration, and use debugging strategies to identify and fix errors.*
*NYS Computer Science and Digital Fluency Learning Standards (2020)*

---

### Learning Objectives — "I Can" Statements

- I can identify the three core programming structures: sequencing, selection (if/else), and iteration (loops).
- I can recognize common programming errors: syntax errors, logic errors, and runtime errors.
- I can apply debugging strategies (print statements, trace tables, rubber duck debugging) to find and fix errors.

---

### Essential Question

When your code doesn't work, what is the most systematic way to find out why?

---

### Background — Pseudocode Convention Used

This lesson uses language-neutral pseudocode. Teacher may adapt examples to the language used in their course (Python, Java, Scratch, etc.).

---

### Lesson Sequence

#### Hook / Warm-Up (8 min)
Show students this pseudocode:

```
SET total = 0
FOR each score in scores:
    SET total = score        ← Bug is here
PRINT "Average = " + total / 5
```

"What does this code try to do? What is the bug? What will happen when it runs?"

#### Direct Instruction (12 min)
1. **Three programming structures:**
   - **Sequencing** — instructions run in order
   - **Selection** — IF/ELSE branches based on a condition
   - **Iteration** — loops that repeat instructions
2. **Three error types:**
   - **Syntax error** — code violates language rules; caught before running
   - **Runtime error** — code crashes while running (e.g., dividing by zero)
   - **Logic error** — code runs but produces wrong output (hardest to find)
3. **Debugging strategies:**
   - **Print/trace statements** — output variable values at each step
   - **Trace table** — track variable values by hand, step by step
   - **Rubber duck debugging** — explain code aloud line by line; often reveals the flaw

#### Debugging Practice — Station Rotation (25 min)
Three buggy pseudocode programs. Students diagnose error type and correct:

**Program 1 (Logic Error):**
```
SET count = 0
FOR i from 1 to 10:
    IF i / 2 = 0:            ← should be i MOD 2 = 0
        SET count = count + 1
PRINT count
```
*What should it count? What does it actually count? Fix it.*

**Program 2 (Logic Error — Wrong Variable):**
```
SET highScore = 0
FOR each score in [45, 72, 91, 33, 88]:
    IF score > highScore:
        SET highScore = score
PRINT "Highest: " + score   ← should be highScore
```

**Program 3 (Off-by-One Error):**
```
SET sum = 0
FOR i from 1 to 9:           ← should be 1 to 10
    SET sum = sum + i
PRINT sum
```
*What total does the program print? What should it print?*

#### Reflection (6 min)
Students write a "Debug Report": For one program, state: error type, where it was found, how they fixed it, and what strategy helped most.

#### Closure (4 min)
Exit ticket: "What is the difference between a syntax error and a logic error? Give an example of each."

---

### SDI & Differentiation Block

#### Supports for MLLs/ELLs

**Entering/Emerging (NYSESLAT Levels 1–2):**
- Provide a visual reference card: sequencing (numbered list), selection (Y/N branch), iteration (circular arrows)
- Allow student to identify the bug by pointing or circling rather than writing an explanation
- Provide word bank: bug, error, loop, fix, output, variable

**Transitioning/Expanding (NYSESLAT Levels 3–4):**
- Pre-teach: sequencing, selection, iteration, syntax, logic, debug, trace
- Sentence frame for Debug Report: "I found an error in Program ___. It was a ___ error because ___. I fixed it by ___."

#### Supports for Students with IEPs

**SDI Adaptation Dimensions: content, methodology, delivery**

- **Content:** Provide only Program 1; provide a trace table template already partially filled in
- **Methodology:** Use the rubber duck strategy with a physical object; model trace table for one iteration
- **Delivery:** Allow partner work on Program 1; extended time; reduce Debug Report to 2 sentences

**Suggested Placement:** ICT

---

### Answer Key

**Warm-Up:** Bug: `SET total = score` should be `SET total = total + score`. The program replaces the total instead of accumulating it.

**Program 1:** Error: logic. `i / 2` does not detect even numbers — need `i MOD 2 = 0`. Fix: change `/` to `MOD`.

**Program 2:** Error: logic (wrong variable). PRINT uses `score` (the last loop variable) instead of `highScore`. Fix: change `score` to `highScore` in PRINT.

**Program 3:** Error: off-by-one (logic). Loop goes 1–9, missing 10. Sum = 45 instead of 55. Fix: change `9` to `10`.

**Exit ticket model:** "A syntax error happens when code breaks the rules of the language (like a missing colon) — the program won't even start. A logic error means the code runs, but the output is wrong because the logic is flawed (like using `+` instead of `*` in a calculation)."

---

### Alignment Record

| Field | Value |
|-------|-------|
| Standard Code | 9-12.CT.4 |
| Standard Text | Implement a program using a programming language that includes sequencing, selection, and iteration, and use debugging strategies to identify and fix errors. |
| Framework | NYS Computer Science and Digital Fluency Learning Standards (2020) |
| Source | nysed.gov — NYS CS & Digital Fluency Learning Standards (2020) |
| Confidence | High Confidence |
| Validation Notes | Code 9-12.CT.4 confirmed. CT = Computational Thinking; grade band 9–12 confirmed. Language-neutral pseudocode used; teacher adapts to course language. |
