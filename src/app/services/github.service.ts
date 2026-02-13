import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GithubService {

  private baseUrl = 'https://api.github.com/users';

  constructor(private http: HttpClient) {}

  getUser(username: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${username}`);
  }

  getUserRepos(username: string) {
  return this.http.get<any[]>(
    `https://api.github.com/users/${username}/repos?sort=updated&per_page=6`
  );
}

getContributionCalendar(username: string, year: number) {

  const from = `${year}-01-01T00:00:00Z`;
  const to = `${year}-12-31T23:59:59Z`;

  const query = `
    query {
      user(login: "${username}") {
        contributionsCollection(from: "${from}", to: "${to}") {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;

  return this.http.post(
    'https://api.github.com/graphql',
    { query }
  );
}

getContributionActivity(username: string, year: number) {
  console.log('Fetching contribution activity for', username, 'in year', year);

  const headers = {
    'Content-Type': 'application/json'
  };

  return this.http.post(
    'https://api.github.com/graphql',
    {
      query: `
        query {
          user(login: "${username}") {
            contributionsCollection(
              from: "${year}-01-01T00:00:00Z",
              to: "${year}-12-31T23:59:59Z"
            ) {
              commitContributionsByRepository(maxRepositories: 10) {
                repository { name owner { login } }
                contributions { totalCount }
              }
              pullRequestContributionsByRepository(maxRepositories: 10) {
                repository { name owner { login } }
                contributions { totalCount }
              }
              issueContributionsByRepository(maxRepositories: 10) {
                repository { name owner { login } }
                contributions { totalCount }
              }
              pullRequestReviewContributionsByRepository(maxRepositories: 10) {
                repository { name owner { login } }
                contributions { totalCount }
              }
            }
          }
        }
      `
    },
    { headers }
  ).pipe(shareReplay(1))
}
}
