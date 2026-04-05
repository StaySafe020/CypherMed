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
    it("Should initialize patient account", async () => {
      const name = "John Doe";
      const dateOfBirth = new anchor.BN(Math.floor(Date.now() / 1000) - 946080000);
      const patientIdHash = "a3f8c2e1b7d4f6a9c0e3b5d8f1a4c7e0b2d5f8a1c4e7b0d3f6a9c2e5b8d1f4";
      const identityHash = "b7d1e9f3a5c8d2e6f0a4b8c1d5e9f3a7b0c4d8e2f6a0b3c7d1e5f9a3b7c0d4";
      const countryCode = "NG";

      await program.methods
        .initializePatient(name, dateOfBirth, patientIdHash, identityHash, countryCode, null)
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
      expect(patientAccount.patientIdHash).to.equal(patientIdHash);
      expect(patientAccount.identityHash).to.equal(identityHash);
      expect(patientAccount.countryCode).to.equal(countryCode);
      expect(patientAccount.isActive).to.be.true;
      expect(patientAccount.recordCount.toNumber()).to.equal(0);

      console.log("Patient registered successfully");
    });

    it("Should update patient emergency contact", async () => {
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

      console.log("Emergency contact updated");
    });
  });

  describe("2. Access Control - Direct Grant", () => {
    it("Should grant access to doctor", async () => {
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

      console.log("Access granted to doctor");
    });

    it("Should revoke access from doctor", async () => {
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

      console.log("Access revoked from doctor");
    });
  });

  describe("3. Access Request Workflow", () => {
    it("Doctor should request access", async () => {
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

      console.log("Access request created");
    });

    it("Patient should approve access request", async () => {
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

      console.log("Access request approved and grant created");
    });
  });

  describe("4. Medical Record Management", () => {
    let auditLogPda: PublicKey;

    it("Should create medical record", async () => {
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

      console.log("Medical record created");
    });

    it("Should update medical record", async () => {
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

      console.log("Medical record updated");
    });

    it("Should access (view) medical record and create audit log", async () => {
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

      console.log("Record accessed and audit logged");
    });
  });

  describe("5. Emergency Access", () => {
    it("Should allow emergency access without permission", async () => {
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

      console.log("Emergency access granted and logged");
    });
  });

  describe("6. Record Deletion", () => {
    it("Should soft delete medical record", async () => {
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

      console.log("Record soft deleted");
    });
  });

  describe("7. Patient Account Management", () => {
    it("Should deactivate patient account", async () => {
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

      console.log("Patient account deactivated");
    });

    it("Should reactivate patient account", async () => {
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

      console.log("Patient account reactivated");
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

      console.log("Access request denied successfully");
    });
  });

  describe("9. Emergency Profile", () => {
    let emergencyProfilePda: PublicKey;

    before(async () => {
      [emergencyProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("emergency_profile"), patientPda.toBuffer()],
        program.programId
      );
    });

    it("Should create emergency profile", async () => {
      await program.methods
        .createEmergencyProfile(
          "O+",                                    // blood_type
          "Penicillin, Latex",                     // allergies
          "Metformin 500mg, Lisinopril 10mg",      // current_medications
          "Type 2 Diabetes, Hypertension",         // chronic_conditions
          "Patient has pacemaker - no MRI",         // emergency_instructions
          true,                                     // is_organ_donor
          false,                                    // dnr_status
          null,                                     // primary_physician
          null,                                     // insurance_info_hash
        )
        .accounts({
          patient: patientPda,
          emergencyProfile: emergencyProfilePda,
          authority: patientKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([patientKeypair])
        .rpc();

      const profile = await program.account.emergencyProfile.fetch(emergencyProfilePda);
      expect(profile.bloodType).to.equal("O+");
      expect(profile.allergies).to.equal("Penicillin, Latex");
      expect(profile.currentMedications).to.equal("Metformin 500mg, Lisinopril 10mg");
      expect(profile.chronicConditions).to.equal("Type 2 Diabetes, Hypertension");
      expect(profile.isOrganDonor).to.be.true;
      expect(profile.dnrStatus).to.be.false;

      console.log("Emergency profile created");
    });

    it("Should update emergency profile", async () => {
      await program.methods
        .updateEmergencyProfile(
          null,                                    // keep blood_type
          "Penicillin, Latex, Sulfa drugs",        // update allergies
          null,                                    // keep medications
          null,                                    // keep conditions
          null,                                    // keep instructions
          null,                                    // keep organ donor
          null,                                    // keep dnr
          null,                                    // keep physician
          null,                                    // keep insurance
        )
        .accounts({
          patient: patientPda,
          emergencyProfile: emergencyProfilePda,
          authority: patientKeypair.publicKey,
        })
        .signers([patientKeypair])
        .rpc();

      const profile = await program.account.emergencyProfile.fetch(emergencyProfilePda);
      expect(profile.allergies).to.equal("Penicillin, Latex, Sulfa drugs");
      expect(profile.bloodType).to.equal("O+"); // unchanged

      console.log("Emergency profile updated");
    });
  });

  describe("10. Consent Delegation (Guardian System)", () => {
    let guardianKeypair: Keypair;
    let consentDelegatePda: PublicKey;

    before(async () => {
      guardianKeypair = Keypair.generate();
      const sig = await provider.connection.requestAirdrop(
        guardianKeypair.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);

      [consentDelegatePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("consent_delegate"),
          patientPda.toBuffer(),
          guardianKeypair.publicKey.toBuffer(),
        ],
        program.programId
      );
    });

    it("Should delegate consent to guardian", async () => {
      await program.methods
        .delegateConsent(
          { parent: {} },     // relationship
          true,               // can_grant_access
          true,               // can_revoke_access
          true,               // can_approve_requests
          true,               // can_create_records
          true,               // can_view_records
          null,               // no expiration
          "Legal guardian of minor patient",
        )
        .accounts({
          patient: patientPda,
          consentDelegate: consentDelegatePda,
          delegate: guardianKeypair.publicKey,
          authority: patientKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([patientKeypair])
        .rpc();

      const delegation = await program.account.consentDelegate.fetch(consentDelegatePda);
      expect(delegation.isActive).to.be.true;
      expect(delegation.canGrantAccess).to.be.true;
      expect(delegation.canRevokeAccess).to.be.true;
      expect(delegation.canApproveRequests).to.be.true;
      expect(delegation.canCreateRecords).to.be.true;
      expect(delegation.canViewRecords).to.be.true;
      expect(delegation.relationship).to.deep.equal({ parent: {} });
      expect(delegation.reason).to.equal("Legal guardian of minor patient");

      console.log("Consent delegated to guardian");
    });

    it("Should revoke delegation", async () => {
      await program.methods
        .revokeDelegation()
        .accounts({
          patient: patientPda,
          consentDelegate: consentDelegatePda,
          authority: patientKeypair.publicKey,
        })
        .signers([patientKeypair])
        .rpc();

      const delegation = await program.account.consentDelegate.fetch(consentDelegatePda);
      expect(delegation.isActive).to.be.false;
      expect(delegation.revokedBy.toString()).to.equal(patientKeypair.publicKey.toString());

      console.log("Delegation revoked");
    });
  });

  describe("11. Emergency Access With Profile", () => {
    it("Should perform emergency access with severity and profile data", async () => {
      // First we need a new active record since previous one was soft-deleted
      const newRecordId = "EMERGENCY-REC-" + Date.now();
      const patientAccount = await program.account.patient.fetch(patientPda);

      const [newRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("record"),
          patientPda.toBuffer(),
          Buffer.from(newRecordId),
        ],
        program.programId
      );

      const [createAuditPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("audit"),
          newRecordPda.toBuffer(),
          patientKeypair.publicKey.toBuffer(),
          Buffer.from("create"),
          Buffer.from(patientAccount.recordCount.toArray("le", 8)),
        ],
        program.programId
      );

      // Patient creates a record themselves
      await program.methods
        .createRecord(
          newRecordId,
          { emergency: {} },
          "sha256_emergency_data_hash_value_here_placeholder_text",
          null,
          "Emergency admission record"
        )
        .accounts({
          patient: patientPda,
          record: newRecordPda,
          accessGrant: null,
          auditLog: createAuditPda,
          provider: patientKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([patientKeypair])
        .rpc();

      // Now perform enhanced emergency access with profile
      const record = await program.account.medicalRecord.fetch(newRecordPda);

      const [emergencyProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("emergency_profile"), patientPda.toBuffer()],
        program.programId
      );

      const [emergencyAuditPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("audit"),
          newRecordPda.toBuffer(),
          emergencyResponderKeypair.publicKey.toBuffer(),
          Buffer.from("emergency_profile"),
          Buffer.from(record.accessCount.toArray("le", 8)),
        ],
        program.programId
      );

      await program.methods
        .emergencyAccessWithProfile(
          "Multi-car collision - patient unresponsive - need immediate treatment info",
          { critical: {} },     // severity
          "Ambulance Unit #7 - GPS: 6.5244,3.3792"
        )
        .accounts({
          patient: patientPda,
          record: newRecordPda,
          emergencyProfile: emergencyProfilePda,
          auditLog: emergencyAuditPda,
          emergencyResponder: emergencyResponderKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([emergencyResponderKeypair])
        .rpc();

      const auditLog = await program.account.auditLog.fetch(emergencyAuditPda);
      expect(auditLog.isEmergency).to.be.true;
      expect(auditLog.success).to.be.true;
      // Metadata should contain blood type and allergy info
      expect(auditLog.metadata).to.include("O+");
      expect(auditLog.metadata).to.include("Penicillin");
      expect(auditLog.metadata).to.include("Critical");

      console.log("Emergency access with profile and severity - Critical");
      console.log("   Blood type, allergies, and DNR status included in audit");
    });
  });
});
