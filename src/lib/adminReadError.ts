import { describePublicReadError } from "@/lib/publicReadError";

export function adminReadErrorMessage(error: unknown) {
  const issue = describePublicReadError(error);
  if (issue.missingMigration) return "Lecture indisponible. Vérifiez que la migration du contenu concerné a été appliquée.";
  if (issue.category === "schema") return "La structure du contenu est incompatible. Vérifiez les migrations et les colonnes attendues.";
  if (issue.category === "timeout") return "Le serveur de données a mis trop de temps à répondre. Réessayez dans un instant.";
  if (issue.category === "network") return "La connexion au serveur de données a échoué. Réessayez lorsque la connexion est disponible.";
  if (issue.category === "access") return "L’accès aux données a été refusé. Vérifiez la configuration serveur et les autorisations.";
  return "Lecture indisponible pour le moment. Réessayez ; les données déjà affichées sont conservées.";
}
