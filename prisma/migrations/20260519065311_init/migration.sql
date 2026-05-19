-- CreateTable
CREATE TABLE "Playbook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "productName" TEXT NOT NULL,
    "productUrl" TEXT,
    "productBrief" TEXT NOT NULL,
    "targetCompany" TEXT NOT NULL,
    "targetUrl" TEXT,
    "industry" TEXT NOT NULL,
    "geography" TEXT NOT NULL,
    "priorityTier" TEXT NOT NULL DEFAULT 'tier1',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "agentStatus" TEXT NOT NULL DEFAULT '[]',
    "failedReason" TEXT,
    "completedAt" DATETIME,
    "openclawSessionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PlaybookRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playbookId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "failedAt" DATETIME,
    "errorMessage" TEXT,
    "openclawSessionId" TEXT,
    "processId" INTEGER,
    "stdoutPath" TEXT,
    "stderrPath" TEXT,
    "rawOutput" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlaybookRun_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlaybookContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playbookId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL DEFAULT '',
    "linkedinUrl" TEXT,
    "email" TEXT,
    "rationale" TEXT,
    "sourceUrls" TEXT NOT NULL DEFAULT '[]',
    "confidence" TEXT NOT NULL DEFAULT 'medium',
    "source" TEXT NOT NULL DEFAULT 'AI Research',
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "personalizationSignals" TEXT NOT NULL DEFAULT '[]',
    "directQuotes" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlaybookContact_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlaybookSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playbookId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentMarkdown" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "orderIndex" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlaybookSection_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlaybookSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playbookId" TEXT NOT NULL,
    "sectionId" TEXT,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "publisher" TEXT,
    "retrievedAt" DATETIME,
    "confidence" TEXT,
    "note" TEXT,
    "claim" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlaybookSource_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PlaybookSource_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "PlaybookSection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlaybookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playbookId" TEXT NOT NULL,
    "runId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlaybookEvent_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PlaybookEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PlaybookRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
