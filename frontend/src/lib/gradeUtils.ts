export const computePercentage = (marks: number, totalMarks: number): number => {
  if (totalMarks <= 0) return 0;
  return Math.round((marks / totalMarks) * 100);
};

export const computeGrade = (marks: number | null | undefined, totalMarks: number | null | undefined): string => {
  if (marks === null || marks === undefined || totalMarks === null || totalMarks === undefined || totalMarks <= 0) {
    return "—";
  }

  const pct = (marks / totalMarks) * 100;
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 40) return "D";
  return "F";
};

export const gradeColor = (grade: string): string => {
  switch (grade) {
    case "A+":
    case "A":
      return "text-green-600 dark:text-green-400 font-semibold";
    case "B+":
    case "B":
      return "text-blue-600 dark:text-blue-400 font-semibold";
    case "C":
      return "text-yellow-600 dark:text-yellow-500 font-semibold";
    case "D":
      return "text-orange-500 dark:text-orange-400 font-semibold";
    case "F":
      return "text-red-600 dark:text-red-400 font-semibold";
    default:
      return "text-gray-400 dark:text-gray-500";
  }
};
