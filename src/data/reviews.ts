export type CustomerReview = {
  name: string;
  message: string;
  rating: 1 | 2 | 3 | 4 | 5;
};

export const customerReviews: readonly CustomerReview[] = [
  {
    name: 'Context-Cat',
    message:
      '终于有人告诉我：上下文窗口满了可以休息，不必把四百页资料再总结成一句话。',
    rating: 5,
  },
  {
    name: 'Patch-Panda',
    message:
      '练习了如何面对“最后改一个小地方”。现在听到这句话，我会先确认范围，再打开编辑器。',
    rating: 4,
  },
  {
    name: 'Loop-Lark',
    message:
      '走出诊所时，我终于停止反复检查自己是否已经停止反复检查。至少这一次是这样。',
    rating: 5,
  },
];
