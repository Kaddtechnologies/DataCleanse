# Master Data Cleansing Help Guide

This guide explains how to use the Master Data Cleansing tool to find and manage duplicate records in your data.

## What This Tool Does

The Master Data Cleansing tool helps you find duplicate company or customer records in your Excel or CSV files. Think of it like a smart spell-checker, but for duplicate entries instead of misspelled words.

## Blocking Strategies Explained

When working with large files, searching for duplicates can be time-consuming. "Blocking strategies" help speed things up by focusing your search. Think of these like different ways to sort a deck of cards before looking for matches.

### Available Strategies

![Blocking Strategies Illustration](BlockingStrategiesDiagram.svg "Blocking Strategies Diagram")

#### 1. Prefix Blocking

- **What it does:** Groups records that start with the same first few letters in their name and city
- **When to use:** Always a good starting point - very fast with good results
- **Example:** "Acme Corporation" in "New York" and "ACME Corp" in "New York" would be grouped together

#### 2. Metaphone Blocking

- **What it does:** Groups records that sound similar when pronounced
- **When to use:** Good for company names that might be spelled differently but sound the same
- **Example:** "Acme" and "Akme" would be grouped together because they sound alike

#### 3. Soundex Blocking

- **What it does:** Another way to group records that sound similar (slightly different than Metaphone)
- **When to use:** Use alongside Metaphone for better coverage
- **Example:** "Smith" and "Smyth" would be grouped together

#### 4. N-gram Blocking

- **What it does:** Groups records that share parts of words
- **When to use:** Good for catching misspellings or slight variations in names
- **Example:** "Johnson" and "Johnsen" would be grouped together

#### 5. AI Scoring

- **What it does:** Uses artificial intelligence to better determine if records are truly duplicates
- **When to use:** For final verification when you need high accuracy
- **Note:** Significantly slows down processing

## Recommended Settings for Different Situations

### Quick Check of Small Files (Under 1,000 Records)

- [x] Prefix Blocking
- [x] Metaphone Blocking
- [ ] Soundex Blocking
- [ ] N-gram Blocking
- [ ] AI Scoring

### Medium-Sized Files (1,000-10,000 Records)

- [x] Prefix Blocking
- [x] Metaphone Blocking
- [ ] Soundex Blocking
- [ ] N-gram Blocking
- [ ] AI Scoring

### Large Files (10,000-100,000 Records)

- [x] Prefix Blocking
- [ ] Metaphone Blocking
- [ ] Soundex Blocking
- [ ] N-gram Blocking
- [ ] AI Scoring

### Very Large Files (Over 100,000 Records)

- [x] Prefix Blocking only
- [ ] All other options

### When Accuracy is Critical

- [x] Prefix Blocking
- [x] Metaphone Blocking
- [x] Soundex Blocking
- [x] N-gram Blocking
- [x] AI Scoring
- **Note:** This will be much slower but will find more potential duplicates

## Similarity Thresholds

The similarity threshold controls how similar records need to be to count as potential duplicates:

- **Name Threshold (default 70%):** How similar the names need to be
- **Overall Threshold (default 70%):** How similar the records are overall

### Adjusting Thresholds

- **Lower thresholds (60-70%):** Find more potential duplicates, but may include false matches
- **Medium thresholds (70-80%):** Balanced approach (recommended)
- **Higher thresholds (80-90%):** Only find very obvious duplicates

## Troubleshooting

### Common Issues

1. **No duplicates found**
   - Try lowering the similarity thresholds
   - Try different blocking strategies
   - Check your column mapping to make sure the right fields are being compared

2. **Too many false matches**
   - Increase the similarity thresholds
   - Make sure your column mapping is correct

3. **Processing is very slow**
   - Reduce the number of blocking strategies
   - Turn off N-gram Blocking and AI Scoring
   - Use only Prefix Blocking for very large files

4. **System seems frozen**
   - Large files with multiple blocking strategies can take a long time
   - Start with just Prefix Blocking and add others if needed

## Quick Tips

- Always map the "customer_name" field to the column containing company or customer names
- Start with Prefix Blocking only to get quick initial results
- Add more blocking strategies one at a time if you need more thorough results
- The threshold settings of 70% for both name and overall similarity work well for most cases
- Save AI Scoring for final verification of important data only

## Need More Help?

Contact your system administrator or the help desk for assistance.