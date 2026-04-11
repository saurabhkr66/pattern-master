import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📝 Seeding Premium Vibrant Notes...');

  const notes = [
    {
      topic: 'Quick Sort',
      content: `### 1. Definition
Quick Sort is a **Divide and Conquer** sorting algorithm that selects a **pivot element** and partitions the array such that elements less than pivot go to left and greater go to right.

- In-place sorting algorithm
- Not stable

### 2. Core Idea
- Choose a pivot
- Partition array around pivot
- Recursively sort left and right parts

### 3. Partitioning (Important)
Rearrange elements so that:
- Left side → elements < pivot
- Right side → elements > pivot

Pivot reaches its correct position

### 4. Algorithm Steps
1. Select pivot element
2. Partition array
3. Recursively apply on left subarray
4. Recursively apply on right subarray

### 5. Pseudo Code
\`\`\`pseudo
quickSort(arr, low, high):
    if low < high:
        pi = partition(arr, low, high)

        quickSort(arr, low, pi - 1)
        quickSort(arr, pi + 1, high)
\`\`\`

### 6. Partition Function
\`\`\`pseudo
partition(arr, low, high):
    pivot = arr[high]
    i = low - 1

    for j = low to high - 1:
        if arr[j] < pivot:
            i++
            swap(arr[i], arr[j])

    swap(arr[i + 1], arr[high])
    return i + 1
\`\`\`

### 7. Recurrence Relation
T(n) = T(k) + T(n-k-1) + Θ(n)
### 8. Time Complexity
- Best Case → O(n log n)
- Average Case → O(n log n)
- Worst Case → O(n^2) (when pivot is worst)

### 9. Space Complexity
- O(log n) (recursion stack)

### 10. Key Properties
- In-place sorting
- Cache friendly (fast in practice)
- Not stable

### 11. Pivot Selection (Important)
- First element
- Last element
- Random element
- Median of three (best practice)

### 12. Quick Sort vs Merge Sort
Quick Sort:
- In-place
- Faster in practice
- Worst case O(n^2)

Merge Sort:
- Stable
- Uses extra space
- Guaranteed O(n log n)

### 13. Applications (GATE Important)
- General-purpose sorting
- Used in libraries (optimized versions)

### 14. Identification Trick
If problem involves:
- In-place sorting
- Partitioning logic
- Fast average performance

→ Use Quick Sort

### 15. Final Insight
Quick Sort = Partition + Recursion

Performance depends heavily on **pivot selection**`
    }
  ];

  for (const item of notes) {
    await prisma.pattern.updateMany({
      where: { topic_name: item.topic },
      data: { short_notes: item.content }
    });
    console.log(`✅ Updated notes for: ${item.topic}`);
  }

  console.log('✨ Premium notes seeding finished!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding notes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
