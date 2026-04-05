import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Cyphermed } from "../target/types/cyphermed";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

describe("CypherMed - Medical Records Protocol", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Cyphermed as Program<Cyphermed>;

  // Test accounts
  let patientKeypair: Keypair;
  let doctorKeypair: Keypair;
  let patientPda: PublicKey;

  before(async () => {
    patientKeypair = Keypair.generate();
    doctorKeypair = Keypair.generate();

    // Airdrop SOL
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        patientKeypair.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      )
    );

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        doctorKeypair.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      )
    );

    [patientPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("patient"), patientKeypair.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Initializes a patient account", async () => {
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

    console.log("Patient registered:", patientPda.toString());
  });

  it("Patient grants access to doctor", async () => {
    const [accessGrantPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("access_grant"),
        patientPda.toBuffer(),
        doctorKeypair.publicKey.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .grantAccess(
        { doctor: {} },
        [{ generalMedical: {} }, { prescription: {} }],
        null,
        true,
        true,
        true,
        "Regular treatment"
      )
      .accounts({
        patient: patientPda,
        accessGrant: accessGrantPda,
        provider: doctorKeypair.publicKey,
        authority: patientKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([patientKeypair])
      .rpc();

    const accessGrant = await program.account.accessGrant.fetch(accessGrantPda);
    expect(accessGrant.isActive).to.be.true;

    console.log("Access granted to doctor");
  });

  it("Doctor creates medical record", async () => {
    const recordId = "REC-" + Date.now();
    const [recordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("record"), patientPda.toBuffer(), Buffer.from(recordId)],
      program.programId
    );

    const patientAccount = await program.account.patient.fetch(patientPda);
    const [auditLogPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("audit"),
        recordPda.toBuffer(),
        doctorKeypair.publicKey.toBuffer(),
        Buffer.from("create"),
        Buffer.from(patientAccount.recordCount.toArray("le", 8)),
      ],
      program.programId
    );

    const [accessGrantPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("access_grant"),
        patientPda.toBuffer(),
        doctorKeypair.publicKey.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .createRecord(
        recordId,
        { generalMedical: {} },
        "sha256_hash_123",
        null,
        "Initial consultation"
      )
      .accounts({
        patient: patientPda,
        record: recordPda,
        accessGrant: accessGrantPda,
        auditLog: auditLogPda,
        provider: doctorKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([doctorKeypair])
      .rpc();

    const record = await program.account.medicalRecord.fetch(recordPda);
    expect(record.isActive).to.be.true;

    console.log("Medical record created with audit trail");
  });
});
