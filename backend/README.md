# Twitter Feed Analyzer - Backend

## Project Overview
This is the backend for a Twitter Feed Analyzer application built for a MongoDB/NoSQL college project. The system stores and analyzes synthetic Twitter/X-style feed data to provide useful analytics such as tweet volume over time, trending hashtags, top tweets, user activity, sentiment distribution, and more.

## Technology Stack
- Node.js
- Express.js
- MongoDB
- Mongoose
- TypeScript
- dotenv for environment configuration

## Prerequisites
- Node.js (v18+ recommended)
- MongoDB (v5+ recommended)
- npm or yarn

## Installation
1. Clone the repository
2. Navigate to the backend directory
3. Install dependencies:
   ```bash
   npm install
   ```

## Environment Configuration
Create a `.env` file in the backend root directory with the following:
```
MONGO_URI=mongodb://127.0.0.1:27017/twitter_analyzer
PORT=5000
```

## Database Setup
Ensure MongoDB is running locally on the default port (27017).

## Seeding the Database
To generate and import the deterministic synthetic dataset:
```bash
npm run seed
```
This will:
- Clear existing data
- Generate 300 users with realistic follower distributions
- Generate 10,000 tweets with realistic engagement patterns
- Create proper indexes for optimal query performance
- Use a fixed random seed (42) for reproducible results

## Verification
To verify the seeded database:
```bash
npm run verify
```
This script checks:
- User and tweet counts
- Unique tweet IDs
- Date range distribution
- Sentiment distribution
- Top hashtags
- Engagement statistics
- Sample tweet inspection

## Running the Server
Development mode (with auto-restart):
```bash
npm run dev
```
Production mode:
```bash
npm run build
npm start
```

## API Endpoints

### Tweets
- `GET /api/tweets` - Get paginated tweets (supports filtering)
- `GET /api/tweets/:tweetId` - Get a specific tweet by ID
- `GET /api/tweets/search?q={term}` - Search tweets by text

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:handle` - Get a specific user by handle

### Analytics
- `GET /api/analytics/overview` - Dashboard KPIs (total tweets, users, engagement totals, averages)
- `GET /api/analytics/timeline` - Tweet volume over time
- `GET /api/analytics/hashtags` - Trending hashtags
- `GET /api/analytics/top-tweets` - Top tweets by engagement score
- `GET /api/analytics/users` - User activity and engagement rankings
- `GET /api/analytics/sentiment` - Sentiment distribution
- `GET /api/analytics/hourly` - Activity by hour of day
- `GET /api/analytics/daily` - Activity by day of week

## Database Design

### Users Collection
Stores profile-level metadata:
- `handle` (unique, indexed)
- `displayName`
- `followersCount`
- `accountCreatedAt`
- `createdAt`, `updatedat` (timestamps)

### Tweets Collection
Core data store with denormalization for performance:
- `tweetId` (unique application-level ID, indexed)
- `userId` (reference to Users)
- `userHandle` (denormalized for fast feed retrieval, indexed)
- `text`
- `createdAt` (indexed for timeline queries)
- `metrics` (likes, retweets, replies)
- `hashtags` (array, indexed for hashtag filtering)
- `keywords` (array, for search relevance)
- `sentiment` (positive/neutral/negative)

### Indexing Strategy
1. `{ createdAt: -1 }` - Global timeline feed
2. `{ userHandle: 1, createdAt: -1 }` - User-specific timeline
3. `{ tweetId: 1 }` - Direct tweet lookup (unique)
4. `{ hashtags: 1, createdAt: -1 }` - Hashtag-filtered timeline
5. `{ handle: 1 }` - User profile lookup (unique)
6. `{ text: "text" }` - Text search capability

## Engagement Score Formula
Our custom project metric (not an official Twitter metric):
```
EngagementScore = likes + (2 × retweets) + (1.5 × replies)
```
**Rationale**: 
- Retweets weighted highest (2×) as they broadcast content to new networks
- Replies weighted 1.5× as they require more effort than likes
- Likes weighted 1× as the baseline engagement action

## Key Features
- Deterministic synthetic data generation with seeded PRNG
- Realistic data distributions (influential users, viral tweets, trending hashtags)
- MongoDB Aggregation Framework for all analytics (no in-memory computation)
- Proper indexing based on actual query patterns
- Text search capability using MongoDB Text Index
- Pagination support for tweet feeds
- Comprehensive verification scripts
- TypeScript for type safety and maintainability

## Notes for College Presentation/Viva
- Demonstrates MongoDB document modeling strengths (arrays, denormalization)
- Shows power of MongoDB Aggregation Framework for data analysis
- Highlights importance of proper indexing for query performance
- Illustrates NoSQL flexibility for social media-like data structures
- All analytics calculated directly from MongoDB data
- Dataset designed to produce meaningful, demonstrable results