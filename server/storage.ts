import { users, projects, files, comments, projectViews, type User, type InsertUser, type Project, type InsertProject, type File, type InsertFile, type Comment, type InsertComment, type ProjectView, type InsertProjectView } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getProject(id: string): Promise<Project | undefined>;
  getProjectByPublicId(publicId: string): Promise<Project | undefined>;
  getProjectsByUserId(userId: string): Promise<Project[]>;
  createProject(project: InsertProject & { userId: string }): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  
  getFile(id: string): Promise<File | undefined>;
  getFileByPublicId(publicId: string): Promise<File | undefined>;
  getFilesByProjectId(projectId: string): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  deleteFile(id: string): Promise<void>;
  
  getComment(id: string): Promise<Comment | undefined>;
  getCommentsByFileId(fileId: string): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: string): Promise<void>;
  
  getProjectView(userId: string, projectId: string): Promise<ProjectView | undefined>;
  updateProjectView(userId: string, projectId: string): Promise<ProjectView>;
  getProjectsWithCommentStats(userId: string): Promise<ProjectWithCommentStats[]>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Ensure hardcoded user exists
    this.ensureHardcodedUser();
  }

  private async ensureHardcodedUser(): Promise<void> {
    try {
      const existingUser = await this.getUserByUsername("user1");
      if (!existingUser) {
        await this.createUser({
          username: "user1",
          password: "password123"
        });
      }
    } catch (error) {
      console.error("Error ensuring hardcoded user:", error);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectByPublicId(publicId: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.publicId, publicId));
    return project || undefined;
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
  }

  async createProject(insertProject: InsertProject & { userId: string }): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values(insertProject)
      .returning();
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const [project] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    if (!project) {
      throw new Error("Project not found");
    }
    return project;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  async getFile(id: string): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file || undefined;
  }

  async getFileByPublicId(publicId: string): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.publicId, publicId));
    return file || undefined;
  }

  async getFilesByProjectId(projectId: string): Promise<File[]> {
    return await db.select().from(files).where(eq(files.projectId, projectId)).orderBy(desc(files.uploadedAt));
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const [file] = await db
      .insert(files)
      .values(insertFile)
      .returning();
    return file;
  }

  async deleteFile(id: string): Promise<void> {
    await db.delete(files).where(eq(files.id, id));
  }

  async getComment(id: string): Promise<Comment | undefined> {
    const [comment] = await db.select().from(comments).where(eq(comments.id, id));
    return comment || undefined;
  }

  async getCommentsByFileId(fileId: string): Promise<Comment[]> {
    return await db.select().from(comments).where(eq(comments.fileId, fileId)).orderBy(desc(comments.createdAt));
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const [comment] = await db
      .insert(comments)
      .values(insertComment)
      .returning();
    return comment;
  }

  async deleteComment(id: string): Promise<void> {
    await db.delete(comments).where(eq(comments.id, id));
  }

  async getProjectView(userId: string, projectId: string): Promise<ProjectView | undefined> {
    const [view] = await db.select().from(projectViews)
      .where(and(eq(projectViews.userId, userId), eq(projectViews.projectId, projectId)));
    return view || undefined;
  }

  async updateProjectView(userId: string, projectId: string): Promise<ProjectView> {
    const existingView = await this.getProjectView(userId, projectId);
    
    if (existingView) {
      const [updatedView] = await db
        .update(projectViews)
        .set({ lastViewedAt: new Date() })
        .where(and(eq(projectViews.userId, userId), eq(projectViews.projectId, projectId)))
        .returning();
      return updatedView;
    } else {
      const [newView] = await db
        .insert(projectViews)
        .values({ userId, projectId, lastViewedAt: new Date() })
        .returning();
      return newView;
    }
  }

  async getProjectsWithCommentStats(userId: string): Promise<ProjectWithCommentStats[]> {
    // Get all projects for the user
    const userProjects = await this.getProjectsByUserId(userId);
    
    const projectsWithStats = await Promise.all(
      userProjects.map(async (project) => {
        // Get files for this project
        const projectFiles = await this.getFilesByProjectId(project.id);
        
        // Get all comments for all files in this project
        const allComments = await Promise.all(
          projectFiles.map(file => this.getCommentsByFileId(file.id))
        );
        const flatComments = allComments.flat();
        
        // Calculate comment stats
        const totalComments = flatComments.length;
        const unresolvedComments = flatComments.filter(
          comment => comment.tag === "To Do" || comment.tag === "In Progress"
        ).length;
        
        // Get last comment time
        const lastCommentTime = flatComments.length > 0 
          ? new Date(Math.max(...flatComments.map(c => new Date(c.createdAt).getTime())))
          : null;
        
        // Check for unread comments
        const projectView = await this.getProjectView(userId, project.id);
        const lastViewedAt = projectView?.lastViewedAt || new Date(0);
        const hasUnreadComments = flatComments.some(
          comment => new Date(comment.createdAt) > lastViewedAt
        );
        
        return {
          ...project,
          files: projectFiles,
          fileCount: projectFiles.length,
          totalComments,
          unresolvedComments,
          lastCommentTime,
          hasUnreadComments,
        };
      })
    );
    
    return projectsWithStats;
  }
}

export interface ProjectWithCommentStats extends Project {
  files?: File[];
  fileCount?: number;
  totalComments: number;
  unresolvedComments: number;
  lastCommentTime: Date | null;
  hasUnreadComments: boolean;
}

export const storage = new DatabaseStorage();