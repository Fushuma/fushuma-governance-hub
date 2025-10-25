CREATE TABLE `community_content` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`contentType` enum('article','video','thread','reddit') NOT NULL,
	`contentUrl` varchar(1000) NOT NULL,
	`authorName` varchar(255),
	`excerpt` text,
	`upvotes` int DEFAULT 0,
	`featured` int DEFAULT 0,
	`submittedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `community_content_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `development_grants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`applicantName` varchar(255) NOT NULL,
	`contactInfo` varchar(255),
	`description` text NOT NULL,
	`valueProposition` text NOT NULL,
	`deliverables` text NOT NULL,
	`roadmap` text NOT NULL,
	`fundingRequest` int NOT NULL,
	`receivingWallet` varchar(100),
	`status` enum('submitted','review','approved','in_progress','completed','rejected') NOT NULL DEFAULT 'submitted',
	`submittedBy` int NOT NULL,
	`githubIssueUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `development_grants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ecosystem_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`category` enum('launchpad_alumni','grant_recipient','core_initiative') NOT NULL,
	`websiteUrl` varchar(500),
	`logoUrl` varchar(500),
	`tokenSymbol` varchar(20),
	`fundingAmount` int,
	`airdropDetails` text,
	`status` varchar(50),
	`socialLinks` text,
	`launchpadProjectId` int,
	`grantId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ecosystem_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `grant_milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grantId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`amount` int NOT NULL,
	`status` enum('pending','in_progress','submitted','approved','paid') NOT NULL DEFAULT 'pending',
	`proofOfWork` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `grant_milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `launchpad_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`teamBackground` text,
	`tokenomics` text,
	`roadmap` text,
	`fundingAmount` int NOT NULL,
	`airdropAllocation` int,
	`status` enum('submitted','review','voting','approved','fundraising','launched','rejected') NOT NULL DEFAULT 'submitted',
	`submittedBy` int NOT NULL,
	`votesFor` int DEFAULT 0,
	`votesAgainst` int DEFAULT 0,
	`websiteUrl` varchar(500),
	`tokenSymbol` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `launchpad_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `news_feed` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text,
	`excerpt` text,
	`source` enum('official','telegram','github','partner','community') NOT NULL,
	`category` varchar(100),
	`sourceUrl` varchar(1000),
	`imageUrl` varchar(1000),
	`publishedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `news_feed_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `votes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`proposalType` enum('launchpad','grant') NOT NULL,
	`proposalId` int NOT NULL,
	`voteChoice` enum('for','against') NOT NULL,
	`votingPower` int NOT NULL,
	`transactionHash` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `votes_id` PRIMARY KEY(`id`)
);
