  import { Component, OnInit } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { GithubService } from '../../services/github.service';
  import { FormsModule } from '@angular/forms';
  import * as echarts from 'echarts';
import { shareReplay } from 'rxjs/operators';

  interface ContributionDay {
    date: string;
    count: number;
    level: number;
  }
  interface RepoContribution {
    name: string;
    owner: string;
  }

  interface ContributionStats {
    commits: number;
    pullRequests: number;
    issues: number;
    codeReviews: number;
  }
  @Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.css'],
  })



  export class ProfileComponent implements OnInit {
    activityRepos: RepoContribution[] = [];
  activityOrgs: string[] = [];
  stats: ContributionStats = {
    commits: 0,
    pullRequests: 0,
    issues: 0,
    codeReviews: 0
  };
    user: any = null;
    loading = true;
    error = false;
    showContributionSettings = false;
    selectedContributionSetting: 'private' | 'overview' = 'private';


    tabs = ['Overview', 'Repositories', 'Projects', 'Packages'];
    activeTab = 'Overview';

    repositories: any[] = [];

    socialLinks = {
      portfolio: 'https://shreeramk.com',
      linkedin: 'https://linkedin.com/in/shreeramkushwaha',
      twitter: 'https://x.com/pom_fret',
    };

    achievements = [
      '/achievements/pull-shark.png',
      '/achievements/yolo.png',
      '/achievements/arctic-code.png',
    ];

    organizations = ['/orgs/uptimeai.png'];

    // ===== CONTRIBUTIONS =====
    selectedYear = new Date().getFullYear();
    years = [
      2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014,
      2013,
    ];

    contributions: ContributionDay[] = [];
    totalContributions = 0;

    constructor(private githubService: GithubService) {}

    ngOnInit(): void {
      this.loadUser();
      this.loadRepos();
      this.loadContributionGraph();
    }

    loadUser() {
      this.githubService.getUser('shreeramk').subscribe({
        next: (data) => {
          this.user = data;
          this.loading = false;
        },
        error: () => {
          this.error = true;
          this.loading = false;
        },
      });
    }

    loadRepos() {
      this.githubService.getUserRepos('shreeramk').subscribe((repos) => {
        this.repositories = repos
          .sort((a, b) => b.stargazers_count - a.stargazers_count)
          .slice(0, 6);
      });
    }

    setTab(tab: string) {
      this.activeTab = tab;
    }

    generateMockContributions() {
      const today = new Date();
      const days = 365;

      this.contributions = [];
      this.totalContributions = 0;

      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(today.getDate() - i);

        const count = Math.floor(Math.random() * 8);
        this.totalContributions += count;

        this.contributions.push({
          date: date.toISOString(),
          count,
          level: this.getIntensityLevel(count),
        });
      }

      this.contributions.reverse();
    }

    getIntensityLevel(count: number) {
      if (count === 0) return 0;
      if (count <= 2) return 1;
      if (count <= 5) return 2;
      if (count <= 10) return 3;
      return 4;
    }

    onYearSelect(year: number) {
      this.selectedYear = year;
      this.loadContributionGraph();
    }
    rawContributions: ContributionDay[] = [];
  isActivityLoading = false;
  loadContributionGraph() {
    this.contributions = [];
    this.totalContributions = 0;

    this.githubService
      .getContributionCalendar('shreeramk', this.selectedYear)
      .subscribe((res: any) => {

        const calendar =
          res.data.user.contributionsCollection.contributionCalendar;

        this.totalContributions = calendar.totalContributions;

        this.rawContributions = [];

        calendar.weeks.forEach((week: any) => {
          week.contributionDays.forEach((day: any) => {
            this.rawContributions.push({
              date: day.date,
              count: day.contributionCount,
              level: this.getIntensityLevel(day.contributionCount),
            });
          });
        });

        this.applyContributionFilters();

        // ✅ ONLY ONE CALL — after calendar loads
        this.loadActivityOverview();
      });
  }

    toggleContributionSettings() {
      this.showContributionSettings = !this.showContributionSettings;
    }

    selectContributionSetting(type: 'private' | 'overview') {
      this.selectedContributionSetting = type;
      this.applyContributionFilters();
      this.showContributionSettings = false;
    }

    applyContributionFilters() {
      if (this.selectedContributionSetting === 'private') {
        this.contributions = [...this.rawContributions];
      }

      if (this.selectedContributionSetting === 'overview') {
        this.contributions = this.rawContributions.map((day) => ({
          ...day,
          level: day.count > 0 ? 2 : 0,
        }));
      }
    }

  loadActivityOverview() {

    if (this.isActivityLoading) return;
    this.isActivityLoading = true;

    this.githubService
      .getContributionActivity('shreeramk', this.selectedYear)
      .subscribe((res: any) => {

        // const data = res.data.user.contributionsCollection;
                const data = res.data.user.contributionsCollection;

        this.activityRepos = [];
        this.activityOrgs = [];

        this.stats = {
          commits: 0,
          pullRequests: 0,
          issues: 0,
          codeReviews: 0
        };

        data.commitContributionsByRepository.forEach((item: any) => {
          this.stats.commits += item.contributions.totalCount;

          this.activityRepos.push({
            name: item.repository.name,
            owner: item.repository.owner.login
          });

          this.activityOrgs.push(item.repository.owner.login);
        });

        data.pullRequestContributionsByRepository.forEach((item: any) => {
          this.stats.pullRequests += item.contributions.totalCount;
        });

        data.issueContributionsByRepository.forEach((item: any) => {
          this.stats.issues += item.contributions.totalCount;
        });

        data.pullRequestReviewContributionsByRepository.forEach((item: any) => {
          this.stats.codeReviews += item.contributions.totalCount;
        });

        setTimeout(() => this.renderXYGraph(), 0);

        this.isActivityLoading = false;
      });
  }

renderXYGraph() {

  const chartDom = document.getElementById('xyGraph');
  if (!chartDom) return;

  const chart = echarts.init(chartDom);

  chart.setOption({
    xAxis: {
      type: 'value',
      min: -100,
      max: 100,
      axisLine: { show: true },
      axisTick: { show: false },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      min: -100,
      max: 100,
      axisLine: { show: true },
      axisTick: { show: false },
      splitLine: { show: false }
    },
    series: [{
      type: 'scatter',
      data: [
        [-this.stats.commits, 0],
        [this.stats.issues, 0],
        [0, this.stats.codeReviews],
        [0, -this.stats.pullRequests]
      ],
      symbolSize: 12
    }]
  });
}
  }
