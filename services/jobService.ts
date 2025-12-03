
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { SavedJob, CandidateResult } from '../types';

// We store jobs in a subcollection: users/{userId}/jobs/{jobId}
// This automatically secures data if using standard Firestore rules (auth.uid == userId)

export const getJobs = async (userId: string): Promise<SavedJob[]> => {
  try {
    const jobsRef = collection(db, 'users', userId, 'jobs');
    const q = query(jobsRef, orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        // Convert Firestore Timestamp back to number for the app
        updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : Date.now()
      } as SavedJob;
    });
  } catch (error) {
    console.error("Failed to load jobs from Firestore", error);
    throw new Error("Failed to load your saved jobs. Check your internet connection.");
  }
};

export const saveJob = async (job: SavedJob): Promise<void> => {
  try {
    if (!job.userId) throw new Error("User ID is required to save a job");

    // Deep clean the object to remove any undefined values or Functions (which Firestore hates)
    // Also strip out the 'file' objects if they accidentally leaked in (though our type says optional)
    const cleanJob = {
      ...job,
      updatedAt: Timestamp.fromMillis(job.updatedAt), // Use Firestore Timestamp
      candidates: job.candidates.map(c => {
         const { file, ...rest } = c; // Ensure no File object
         return {
           ...rest,
           // Ensure undefined fields are null or removed
           summary: rest.summary || null,
           embedding: rest.embedding || [] 
         };
      }),
      jobSpec: job.jobSpec ? {
        ...job.jobSpec,
        file: null // Ensure no File object
      } : null
    };

    // Remove the file property from jobSpec inside cleanJob if it exists (extra safety)
    if (cleanJob.jobSpec && 'file' in cleanJob.jobSpec) {
      delete (cleanJob.jobSpec as any).file;
    }

    const jobDocRef = doc(db, 'users', job.userId, 'jobs', job.id);
    await setDoc(jobDocRef, cleanJob);
    
  } catch (error: any) {
    console.error("Failed to save job to Firestore", error);
    if (error.code === 'permission-denied') {
      throw new Error("You do not have permission to save this job.");
    }
    throw new Error("Failed to save job to the cloud.");
  }
};

export const deleteJob = async (userId: string, jobId: string): Promise<void> => {
  try {
    const jobDocRef = doc(db, 'users', userId, 'jobs', jobId);
    await deleteDoc(jobDocRef);
  } catch (error) {
    console.error("Failed to delete job", error);
    throw new Error("Failed to delete the job.");
  }
};
