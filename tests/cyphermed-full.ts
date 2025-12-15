import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Cyphermed } from "../target/types/cyphermed";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

describe("CypherMed - Comprehensive Test Suite", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Cyphermed as Program<Cyphermed>;

  // Test accounts
  let patientKeypair: Keypair;
  let doctor1Keypair: Keypair;
  let doctor2Keypair: Keypair;
  let hospitalKeypair: Keypair;
  let emergencyResponderKeypair: Keypair;
  
  let patientPda: PublicKey;
  let recordPda: PublicKey;
  let accessGrantPda: PublicKey;
  let accessRequestPda: PublicKey;

  const recordId = "MED-REC-" + Date.now();

  before(async () => {
    // Generate keypairs
    patientKeypair = Keypair.generate();
    doctor1Keypair = Keypair.generate();
    doctor2Keypair = Keypair.generate();
    hospitalKeypair = Keypair.generate();
    emergencyResponderKeypair = Keypair.generate();

    // Airdrop SOL to all accounts
    const accounts = [
      patientKeypair,
      doctor1Keypair,
      doctor2Keypair,
      hospitalKeypair,
      emergencyResponderKeypair,
    ];

    for (const account of accounts) {
      const sig = await provider.connection.requestAirdrop(
        account.publicKey,
        3 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);
    }

    // Derive PDAs
    [patientPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("patient"), patientKeypair.publicKey.toBuffer()],
      program.programId
    );

    [recordPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("record"),
        patientPda.toBuffer(),
        Buffer.from(recordId),
      ],
      program.programId
    );

    [accessGrantPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("access_grant"),
        patientPda.toBuffer(),
        doctor1Keypair.publicKey.toBuffer(),
      ],
      program.programId
    );

    [accessRequestPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("access_request"),
        patientPda.toBuffer(),
        doctor2Keypair.publicKey.toBuffer(),
      ],
      program.programId
    );

    console.log("\n🔧 Test Setup Complete");
    console.log("Patient:", patientKeypair.publicKey.toString());
    console.log("Doctor 1:", doctor1Keypair.publicKey.toString());
    console.log("Doctor 2:", doctor2Keypair.publicKey.toString());
  });

  describe("1. Patient Registration", () => {
    it("✅ Should initialize patient account", async () => {
      const name = "John Doe";
      const dateOfBirth = new anchor.BN(Math.floor(Date.now() / 1000) - 946080000);

      await program.methods
        .initializePatient(name, dateOfBirth, null)
        .accounts({
          patient: patientPda,
          authority: patientKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([patientKeypair])
        .rpc();

      const patientAccount = await program.account.patient.fetch(patientPda);
      
      expect(patientAccount.authority.toString()).to.equal(
        patientKeypair.publicKey.toString()
      );
      expect(patientAccount.name).to.equal(name);
      expect(patientAccount.isActive).to.be.true;
      expect(patientAccount.recordCount.toNumber()).to.equal(0);

      console.log("✅ Patient registered successfully");
    });

    it("✅ Should update patient emergency contact", async () => {
      const emergencyContact = Keypair.generate().publicKey;

      await program.methods
        .updatePatient(emergencyContact)
        .accounts({
          patient: patientPda,
          authority: patientKeypair.publicKey,
        })
        .signers([patientKeypair])
        .rpc();

      const patientAccount = await program.account.patient.fetch(patientPda);
      expect(patientAccount.emergencyContact?.toString()).to.equal(
        emergencyContact.toString()
      );

      console.log("✅ Emergency contact updated");
    });
  });

  describe("2. Access Control - Direct Grant", () => {
    it("✅ Should grant access to doctor", async () => {
      const role = { doctor: {} };
      const allowedRecordTypes = [
        { generalMedical: {} },
        { prescription: {} },
      ];

      await program.methods
        .grantAccess(
          role,
          allowedRecordTypes,
          null, // No expiration
          true, // can_create
          true, // can_modify
          true, // can_view
          "Primary care physician"
        )
        .accounts({
          patient: patientPda,
          accessGrant: accessGrantPda,
          provider: doctor1Keypair.publicKey,
          authority: patientKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([patientKeypair])
        .rpc();

      const accessGrant = await program.account.accessGrant.fetch(accessGrantPda);
      
      expect(accessGrant.isActive).to.be.true;
      expect(accessGrant.canCreate).to.be.true;
      expect(accessGrant.canView).to.be.true;

      console.log("✅ Access granted to doctor");
    });

    it("✅ Should revoke access from doctor", async () => {
      await program.methods
        .revokeAccess()
        .accounts({
          patient: patientPda,
          accessGrant: accessGrantPda,
          authority: patientKeypair.publicKey,
        })
        .signers([patientKeypair])
        .rpc();

      const accessGrant = await program.account.accessGrant.fetch(accessGrantPda);
      expect(accessGrant.isActive).to.be.false;

      console.log("✅ Access revoked from doctor");
    });
  });

  describe("3. Access Request Workflow", () => {
    it("✅ Doctor should request access", async () => {
      const role = { doctor: {} };
      const reason = "Need access for routine checkup";

      await program.methods
        .requestAccess(role, reason, null)
        .accounts({
          patient: patientPda,
          accessRequest: accessRequestPda,
          requester: doctor2Keypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([doctor2Keypair])
        .rpc();

      const request = await program.account.accessRequest.fetch(accessRequestPda);
      
      expect(request.patient.toString()).to.equal(patientPda.toString());
      expect(request.requester.toString()).to.equal(doctor2Keypair.publicKey.toString());
      expect(request.reason).to.equal(reason);
      expect(request.status).to.deep.equal({ pending: {} });

      console.log("✅ Access request created");
    });

    it("✅ Patient should approve access request", async () => {
      const [newAccessGrantPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("access_grant"),
          patientPda.toBuffer(),
          doctor2Keypair.publicKey.toBuffer(),
        ],
        program.programId
      );

      const allowedRecordTypes = [{ generalMedical: {} }];

      await program.methods
        .approveAccessRequest(
          allowedRecordTypes,
          null, // No expiration
          true, // can_create
          false, // can_modify
          true, // can_view
        )
        .accounts({
          patient: patientPda,
          accessRequest: accessRequestPda,
          accessGrant: newAccessGrantPda,
          authority: patientKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([patientKeypair])
        .rpc();

      const request = await program.account.accessRequest.fetch(accessRequestPda);
      expect(request.status).to.deep.equal({ approved: {} });

      const grant = await program.account.accessGrant.fetch(newAccessGrantPda);
      expect(grant.isActive).to.be.true;
      expect(grant.canView).to.be.true;

      console.log("✅ Access request approved and grant created");
    });
  });

  describe("4. Medical Record Management", () => {
    let auditLogPda: PublicKey;

    it("✅ Should create medical record", async () => {
      const patientAccount = await program.account.patient.fetch(patientPda);

      [auditLogPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("audit"),
          recordPda.toBuffer(),
          doctor2Keypair.publicKey.toBuffer(),
          Buffer.from("create"),
          Buffer.from(patientAccount.recordCount.toArray("le", 8)),
        ],
        program.programId
      );

      const [accessGrant] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("access_grant"),
          patientPda.toBuffer(),
          doctor2Keypair.publicKey.toBuffer(),
        ],
        program.programId
      );

      const recordType = { generalMedical: {} };
      const dataHash = "sha256_abc123_encrypted_data_hash";

      await program.methods
        .createRecord(
          recordId,
          recordType,
          dataHash,
          null, // No IPFS CID
          "Initial consultation - Patient presents with flu symptoms"
        )
        .accounts({
          patient: patientPda,
          record: recordPda,
          accessGrant: accessGrant,
          auditLog: auditLogPda,
          provider: doctor2Keypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([doctor2Keypair])
        .rpc();

      const record = await program.account.medicalRecord.fetch(recordPda);
      expect(record.patient.toString()).to.equal(patientPda.toString());
      expect(record.isActive).to.be.true;
      expect(record.dataHash).to.equal(dataHash);

      console.log("✅ Medical record created");
    });

    it("✅ Should update medical record", async () => {
      const updateNote = "Patient advised to stop aspirin - allergic reaction observed";
      const newMetadata = "Updated after follow-up visit";

      const record = await program.account.medicalRecord.fetch(recordPda);
      
      const [updateAuditPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("audit"),
          recordPda.toBuffer(),
          doctor2Keypair.publicKey.toBuffer(),
          Buffer.from("modify"),
          Buffer.from(record.accessCount.toArray("le", 8)),
        ],
        program.programId
      );

      const [accessGrant] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("access_grant"),
          patientPda.toBuffer(),
          doctor2Keypair.publicKey.toBuffer(),
        ],
        program.programId
      );

      await program.methods
        .updateRecord(
          null, // Keep same data hash
          newMetadata,
          updateNote
        )
        .accounts({
          patient: patientPda,
          record: recordPda,
          accessGrant: accessGrant,
          auditLog: updateAuditPda,
          updater: doctor2Keypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([doctor2Keypair])
        .rpc();

      const updatedRecord = await program.account.medicalRecord.fetch(recordPda);
      expect(updatedRecord.metadata).to.equal(newMetadata);

      console.log("✅ Medical record updated");
    });

    it("✅ Should access (view) medical record and create audit log", async () => {
      const record = await program.account.medicalRecord.fetch(recordPda);
      
      const [viewAuditPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("audit"),
          recordPda.toBuffer(),
          doctor2Keypair.publicKey.toBuffer(),
          Buffer.from("access"),
          Buffer.from(record.accessCount.toArray("le", 8)),
        ],
        program.programId
      );

      const [accessGrant] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("access_grant"),
          patientPda.toBuffer(),
          doctor2Keypair.publicKey.toBuffer(),
        ],
        program.programId
      );

      await program.methods
        .accessRecord("Web Portal - Chrome Browser")
        .accounts({
          patient: patientPda,
          record: recordPda,
          accessGrant: accessGrant,
          auditLog: viewAuditPda,
          accessor: doctor2Keypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([doctor2Keypair])
        .rpc();

      const auditLog = await program.account.auditLog.fetch(viewAuditPda);
      expect(auditLog.success).to.be.true;
      expect(auditLog.action).to.deep.equal({ view: {} });

      console.log("✅ Record accessed and audit logged");
    });
  });

  describe("5. Emergency Access", () => {
    it("✅ Should allow emergency access without permission", async () => {
      const record = await program.account.medicalRecord.fetch(recordPda);
      
      const [emergencyAuditPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("audit"),
          recordPda.toBuffer(),
          emergencyResponderKeypair.publicKey.toBuffer(),
          Buffer.from("emergency"),
          Buffer.from(record.accessCount.toArray("le", 8)),
        ],
        program.programId
      );

      const justification = "Car accident - unconscious patient - life threatening";

      await program.methods
        .emergencyAccess(justification, "Ambulance #142")
        .accounts({
          patient: patientPda,
          record: recordPda,
          auditLog: emergencyAuditPda,
          emergencyResponder: emergencyResponderKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([emergencyResponderKeypair])
        .rpc();

      const auditLog = await program.account.auditLog.fetch(emergencyAuditPda);
      expect(auditLog.isEmergency).to.be.true;
      expect(auditLog.success).to.be.true;
      expect(auditLog.emergencyJustification).to.equal(justification);

      console.log("✅ Emergency access granted and logged");
    });
  });

  describe("6. Record Deletion", () => {
    it("✅ Should soft delete medical record", async () => {
      const record = await program.account.medicalRecord.fetch(recordPda);
      
      const [deleteAuditPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("audit"),
          recordPda.toBuffer(),
          patientKeypair.publicKey.toBuffer(),
          Buffer.from("delete"),
          Buffer.from(record.accessCount.toArray("le", 8)),
        ],
        program.programId
      );

      const deletionReason = "Patient requested removal - incorrect diagnosis";

      await program.methods
        .deleteRecord(deletionReason)
        .accounts({
          patient: patientPda,
          record: recordPda,
          auditLog: deleteAuditPda,
          deleter: patientKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([patientKeypair])
        .rpc();

      const deletedRecord = await program.account.medicalRecord.fetch(recordPda);
      expect(deletedRecord.isActive).to.be.false;

      const auditLog = await program.account.auditLog.fetch(deleteAuditPda);
      expect(auditLog.action).to.deep.equal({ delete: {} });

      console.log("✅ Record soft deleted");
    });
  });

  describe("7. Patient Account Management", () => {
    it("✅ Should deactivate patient account", async () => {
      await program.methods
        .deactivatePatient()
        .accounts({
          patient: patientPda,
          authority: patientKeypair.publicKey,
        })
        .signers([patientKeypair])
        .rpc();

      const patientAccount = await program.account.patient.fetch(patientPda);
      expect(patientAccount.isActive).to.be.false;

      console.log("✅ Patient account deactivated");
    });

    it("✅ Should reactivate patient account", async () => {
      await program.methods
        .reactivatePatient()
        .accounts({
          patient: patientPda,
          authority: patientKeypair.publicKey,
        })
        .signers([patientKeypair])
        .rpc();

      const patientAccount = await program.account.patient.fetch(patientPda);
      expect(patientAccount.isActive).to.be.true;

      console.log("✅ Patient account reactivated");
    });
  });

  describe("8. Access Denial Test", () => {
    it("❌ Should deny access request", async () => {
      // Create new request
      const [newRequestPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("access_request"),
          patientPda.toBuffer(),
          hospitalKeypair.publicKey.toBuffer(),
        ],
        program.programId
      );

      await program.methods
        .requestAccess({ hospital: {} }, "Hospital admission", null)
        .accounts({
          patient: patientPda,
          accessRequest: newRequestPda,
          requester: hospitalKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([hospitalKeypair])
        .rpc();

      // Deny it
      await program.methods
        .denyAccessRequest("Not my preferred hospital")
        .accounts({
          patient: patientPda,
          accessRequest: newRequestPda,
          authority: patientKeypair.publicKey,
        })
        .signers([patientKeypair])
        .rpc();

      const request = await program.account.accessRequest.fetch(newRequestPda);
      expect(request.status).to.deep.equal({ denied: {} });
      expect(request.denialReason).to.equal("Not my preferred hospital");

      console.log("✅ Access request denied successfully");
    });
  });
});
