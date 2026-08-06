import OngoingJobsPage from './OngoingJobsPage.jsx';

// "Jobs Done" is a view of the same durable Job record, never a second place
// to recreate or reconcile completed work.
export default function CompletedJobsPage() {
  return <OngoingJobsPage completedOnly />;
}
