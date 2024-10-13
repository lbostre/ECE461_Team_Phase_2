import axios, { AxiosError } from 'axios';

// Load your GitHub token from an environment variable
const githubToken = process.env.GITHUB_TOKEN;

const headers = {
  'Authorization': `token ${githubToken}`,
  'Accept': 'application/vnd.github.v3+json',  // For the REST API
};

// Example request to fetch user details
const fetchGitHubUser = async () => {
  const url = 'https://api.github.com/user';
  try {
    const response = await axios.get(url, { headers });
    console.log(response.data);
  } catch (error) {
    console.error(error);
  }
};

// Example request to execute a GraphQL query
const fetchGitHubGraphQL = async () => {
  const query = `
  {
    viewer {
      login
    }
  }`;

  try {
    const response = await axios.post(
      'https://api.github.com/graphql',
      { query },   // Send the query wrapped inside an object
      { headers }
    );
    console.log(response.data);
  } catch (error) {
    console.error(error);
  }
};

// Check rate limits
const checkRateLimit = async () => {
  try {
    const response = await axios.get('https://api.github.com/rate_limit', { headers });
    console.log(response.data.rate);
  } catch (error) {
    console.error(error);
  }
};

// ETag-based request with conditional fetching
let lastETag: string | null = null;

const fetchWithETag = async () => {
  try {
    const response = await axios.get('https://api.github.com/repos/owner/repo/issues', {
      headers: {
        ...headers,
        'If-None-Match': lastETag || '',
      },
    });

    if (response.status === 200) {
      // New data available
      console.log(response.data);
      lastETag = response.headers.etag;  // Store the ETag
    } else if (response.status === 304) {
      // Data not modified
      console.log('No new data');
    }
  } catch (error) {
    console.error(error);
  }
};

// Retry request function with exponential backoff
const retryRequest = async (url: string, retries: number = 3, delay: number = 1000) => {
  try {
    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    const e = error as AxiosError;
    if (retries > 0 && e.response && e.response.status === 403) {
      const retryAfter = e.response.headers['retry-after'] || delay;
      console.log(`Rate limit hit. Retrying after ${retryAfter}ms...`);

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(retryRequest(url, retries - 1, delay * 2));  // Exponential backoff
        }, retryAfter);
      });
    } else {
      throw error;
    }
  }
};

// Call functions
fetchGitHubUser();
fetchGitHubGraphQL();
checkRateLimit();
fetchWithETag();
