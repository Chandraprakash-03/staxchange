import prisma from './prisma';

/**
 * Database utility functions for common operations
 */
export class DatabaseUtils {
  /**
   * Check if the database connection is healthy
   */
  static async healthCheck(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  static async getStatistics() {
    try {
      const [userCount, projectCount, jobCount] = await Promise.all([
        prisma.user.count(),
        prisma.project.count(),
        prisma.conversionJob.count(),
      ]);

      return {
        users: userCount,
        projects: projectCount,
        conversionJobs: jobCount,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to get database statistics:', error);
      throw error;
    }
  }

  /**
   * Clean up old conversion jobs (older than specified days)
   */
  static async cleanupOldJobs(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await prisma.conversionJob.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
          status: {
            in: ['completed', 'failed'],
          },
        },
      });

      return result.count;
    } catch (error) {
      console.error('Failed to cleanup old jobs:', error);
      throw error;
    }
  }

  /**
   * Reset database (for development/testing only)
   */
  static async reset(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Database reset is not allowed in production');
    }

    try {
      // Delete in order to respect foreign key constraints
      await prisma.conversionJob.deleteMany();
      await prisma.project.deleteMany();
      await prisma.user.deleteMany();
    } catch (error) {
      console.error('Failed to reset database:', error);
      throw error;
    }
  }

  /**
   * Seed database with sample data (for development/testing)
   */
  static async seed(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Database seeding is not allowed in production');
    }

    try {
      // Create sample user
      const user = await prisma.user.create({
        data: {
          githubId: 'sample-user',
          username: 'sampleuser',
          email: 'sample@example.com',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      });

      // Create sample project
      const project = await prisma.project.create({
        data: {
          name: 'Sample React Project',
          githubUrl: 'https://github.com/sampleuser/react-app',
          userId: user.id,
          originalTechStack: {
            language: 'javascript',
            framework: 'react',
            buildTool: 'webpack',
            packageManager: 'npm',
            additional: {},
          },
          targetTechStack: {
            language: 'typescript',
            framework: 'nextjs',
            buildTool: 'turbopack',
            packageManager: 'npm',
            additional: {},
          },
          status: 'ready',
        },
      });

      // Create sample conversion job
      await prisma.conversionJob.create({
        data: {
          projectId: project.id,
          plan: {
            id: 'sample-plan',
            projectId: project.id,
            tasks: [
              {
                id: 'task-1',
                type: 'analysis',
                description: 'Analyze React components',
                inputFiles: ['src/components/'],
                outputFiles: ['analysis.json'],
                dependencies: [],
                agentType: 'analysis',
                priority: 1,
                status: 'completed',
                estimatedDuration: 300,
              },
            ],
            estimatedDuration: 300,
            complexity: 'medium',
            warnings: [],
            feasible: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          status: 'completed',
          progress: 100,
        },
      });

      console.log('Database seeded successfully');
    } catch (error) {
      console.error('Failed to seed database:', error);
      throw error;
    }
  }
}

export default DatabaseUtils;