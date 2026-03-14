import React from 'react';
import ProjectsCard from './ProjectsCard';
import AreaCard from './AreaCard';
import CarbonCard from './CarbonCard';
import EarningsCard from './EarningsCard';
import './StatsCards.css';

const StatsCards = ({ data, loading }) => {
  return (
    <div className="stats-cards-grid fade-in">
      <ProjectsCard 
        total={data.totalProjects}
        pending={data.pendingProjects}
        review={data.reviewProjects}
        approved={data.approvedProjects}
        rejected={data.rejectedProjects}
        loading={loading}
      />
      <AreaCard 
        totalArea={data.totalArea}
        monthlyIncrease={data.monthlyAreaIncrease}
        loading={loading}
      />
      <CarbonCard 
        totalCarbon={data.totalCarbon}
        totalCredits={data.totalCredits}
        confirmedCredits={data.confirmedCredits}
        estimatedCredits={data.estimatedCredits}
        mintedProjectsCount={data.mintedProjectsCount}
        loading={loading}
      />
      <EarningsCard 
        totalEarnings={data.totalEarnings}
        totalCredits={data.totalCredits}
        confirmedCredits={data.confirmedCredits}
        estimatedCredits={data.estimatedCredits}
        statesCount={data.statesCount}
        loading={loading}
      />
    </div>
  );
};

export default StatsCards;
